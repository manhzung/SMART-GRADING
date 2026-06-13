#!/usr/bin/env python3
"""
OMR Processing Bridge Script

This script bridges Node.js and OMRChecker. It reads base64 image from stdin,
processes with OMRChecker, outputs JSON to stdout.

Usage:
    echo '{"image": "...", "template": {...}, "evaluation": {...}, "options": {...}}' | python omr_process.py

Input JSON:
    - image (str): Base64 encoded image data
    - template (dict): Template configuration object
    - evaluation (dict, optional): Evaluation configuration object
    - options (dict, optional): Processing options

Output JSON:
    - success (bool): Whether processing succeeded
    - answers (dict, optional): Detected answers on success
    - score (float, optional): Calculated score on success
    - warnings (list, optional): Warning messages
    - annotated_image (str, optional): Base64 encoded annotated image
    - processing_time_ms (int): Processing time in milliseconds
    - error (str, optional): Error message on failure
    - error_code (str, optional): Error code on failure
"""

import base64
import json
import os
import sys
import tempfile
import time
from copy import deepcopy
from io import StringIO
from pathlib import Path

import cv2
import numpy
from dotmap import DotMap

# Add OMRChecker to path
# Script is at: server/scripts/omr_process.py
# OMRChecker is at: ../../OMRChecker (relative from scripts/)
# Note: We add the OMRChecker root, not src/, because imports use "from src.xxx import yyy"
SCRIPT_DIR = Path(__file__).resolve().parent
OMRCHECKER_ROOT = (SCRIPT_DIR.parent.parent / "OMRChecker").resolve()

if str(OMRCHECKER_ROOT) not in sys.path:
    sys.path.insert(0, str(OMRCHECKER_ROOT))

from src.core import ImageInstanceOps
from src.defaults import CONFIG_DEFAULTS, TEMPLATE_DEFAULTS
from src.evaluation import AnswerMatcher, SectionMarkingScheme
from src.template import Template
from src.utils.parsing import get_concatenated_response, open_evaluation_with_validation
from deepmerge import Merger


OVERRIDE_MERGER = Merger(
    [(dict, ["merge"])],
    ["override"],
    ["override"],
)


def output_result(result: dict):
    """Output JSON result to stdout and exit."""
    print(json.dumps(result))
    sys.stdout.flush()
    sys.exit(0 if result.get("success", False) else 1)


def output_error(error: str, error_code: str = "UNKNOWN_ERROR"):
    """Output error JSON to stdout and exit."""
    output_result({
        "success": False,
        "error": error,
        "error_code": error_code,
    })


def validate_input(data: dict) -> tuple:
    """Validate and extract input data. Returns (image_bytes, template, evaluation, options)."""
    if not isinstance(data, dict):
        return None, None, None, None, "Invalid input: expected JSON object"

    # Extract image (base64)
    image_b64 = data.get("image")
    if not image_b64:
        return None, None, None, None, "Missing required field: image"
    
    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception as e:
        return None, None, None, None, f"Invalid base64 image data: {str(e)}"

    # Extract template
    template_config = data.get("template")
    if not template_config:
        return None, None, None, None, "Missing required field: template"
    if not isinstance(template_config, dict):
        return None, None, None, None, "Invalid template: expected object"

    # Extract evaluation (optional)
    evaluation_config = data.get("evaluation")
    if evaluation_config is not None and not isinstance(evaluation_config, dict):
        return None, None, None, None, "Invalid evaluation: expected object or null"

    # Extract options (optional)
    options = data.get("options", {})
    if not isinstance(options, dict):
        return None, None, None, None, "Invalid options: expected object"

    return image_bytes, template_config, evaluation_config, options, None


def create_tuning_config(options: dict) -> DotMap:
    """Create tuning config from options with defaults."""
    config_dict = deepcopy(CONFIG_DEFAULTS.toDict())
    
    # Override with provided options
    if "dimensions" in options:
        config_dict["dimensions"].update(options["dimensions"])
    if "threshold_params" in options:
        config_dict["threshold_params"].update(options["threshold_params"])
    if "alignment_params" in options:
        config_dict["alignment_params"].update(options["alignment_params"])
    if "outputs" in options:
        config_dict["outputs"].update(options["outputs"])
    
    return DotMap(config_dict, _dynamic=False)


def merge_template_with_defaults(template_config: dict) -> dict:
    """Merge template config with defaults."""
    merged = OVERRIDE_MERGER.merge(deepcopy(TEMPLATE_DEFAULTS), template_config)
    return merged


def create_template_from_config(template_config: dict, tuning_config: DotMap) -> Template:
    """Create a Template instance from config dict."""
    # Write template to temp file as Template expects a path
    template_json = merge_template_with_defaults(template_config)
    
    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(template_json, f)
        temp_path = f.name
    
    try:
        template = Template(Path(temp_path), tuning_config)
        return template
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except:
            pass


def create_evaluation_from_config(evaluation_config: dict, template: Template, 
                                   tuning_config: DotMap) -> 'EvaluationConfig':
    """Create an EvaluationConfig instance from config dict."""
    # Create temp directory for evaluation
    temp_dir = tempfile.mkdtemp()
    
    # Write evaluation config to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, 
                                     dir=temp_dir, prefix='evaluation') as f:
        json.dump(evaluation_config, f)
        eval_path = f.name
    
    try:
        from src.evaluation import EvaluationConfig
        eval_config = EvaluationConfig(
            Path(temp_dir),
            Path(eval_path),
            template,
            tuning_config
        )
        return eval_config
    finally:
        # Clean up will happen at end
        pass


def process_omr(image_bytes: bytes, template_config: dict, 
                evaluation_config: dict, options: dict) -> dict:
    """Process OMR image with given configurations."""
    start_time = time.time()
    warnings = []
    
    # Create tuning config
    tuning_config = create_tuning_config(options)
    
    # Ensure show_image_level is 0 to avoid GUI issues
    tuning_config.outputs.show_image_level = 0
    tuning_config.outputs.save_image_level = 0
    
    # Create template
    template = create_template_from_config(template_config, tuning_config)
    
    # Decode image
    nparr = cv2.imdecode(
        numpy.frombuffer(image_bytes, numpy.uint8),
        cv2.IMREAD_GRAYSCALE
    )
    
    if nparr is None:
        raise Exception("Failed to decode image")
    
    # Create image instance ops
    image_ops = template.image_instance_ops
    
    # Apply preprocessors
    in_omr = image_ops.apply_preprocessors("<memory>", nparr, template)
    
    if in_omr is None:
        raise Exception("Image preprocessing failed")
    
    # Read OMR response
    (
        response_dict,
        final_marked,
        multi_marked,
        _,
    ) = image_ops.read_omr_response(
        template,
        image=in_omr,
        name="omr_response",
        save_dir=None
    )
    
    # Concatenate responses
    answers = get_concatenated_response(response_dict, template)
    
    # Check for multi-marked bubbles
    if multi_marked:
        warnings.append("Multiple bubbles marked in one or more fields")
    
    # Calculate score if evaluation is provided
    score = None
    if evaluation_config:
        eval_config = create_evaluation_from_config(evaluation_config, template, tuning_config)
        eval_config.prepare_and_validate_omr_response(answers)
        
        current_score = 0.0
        for question in eval_config.questions_in_order:
            marked_answer = answers[question]
            delta = eval_config.match_answer_for_question(
                current_score, question, marked_answer
            )
            current_score += delta
        
        score = round(current_score, 2)
    
    # Encode annotated image to base64
    annotated_b64 = None
    if final_marked is not None:
        _, buffer = cv2.imencode('.png', final_marked)
        annotated_b64 = base64.b64encode(buffer).decode('utf-8')
    
    # Calculate processing time
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    return {
        "success": True,
        "answers": answers,
        "score": score,
        "warnings": warnings if warnings else None,
        "annotated_image": annotated_b64,
        "processing_time_ms": processing_time_ms,
    }


def main():
    """Main entry point."""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            output_error("No input data provided", "NO_INPUT")
        
        # Parse JSON
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError as e:
            output_error(f"Invalid JSON input: {str(e)}", "INVALID_JSON")
        
        # Validate input
        image_bytes, template_config, evaluation_config, options, error = validate_input(data)
        if error:
            output_error(error, "VALIDATION_ERROR")
        
        # Process OMR
        result = process_omr(image_bytes, template_config, evaluation_config, options)
        
        # Output result
        output_result(result)
        
    except Exception as e:
        # Catch all errors and output as JSON
        import traceback
        error_msg = str(e)
        error_code = "PROCESSING_ERROR"
        
        # Map common errors to codes
        if "template" in error_msg.lower():
            error_code = "TEMPLATE_ERROR"
        elif "evaluation" in error_msg.lower():
            error_code = "EVALUATION_ERROR"
        elif "image" in error_msg.lower():
            error_code = "IMAGE_ERROR"
        
        output_error(error_msg, error_code)


if __name__ == "__main__":
    main()
