import 'dart:convert';
import 'dart:typed_data';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_grading_mobile/domain/omr/models/omr_template.dart';
import 'package:smart_grading_mobile/domain/omr/models/evaluation_config.dart';
import 'package:smart_grading_mobile/domain/omr/models/field_block.dart';

/// Represents a pending submission queued for offline sync.
class PendingSubmission {
  final String id;
  final String examId;
  final String? studentId;
  final String? classId;
  final Uint8List imageBytes;
  final Map<String, String> answers;
  final double score;
  final double maxScore;
  final DateTime timestamp;
  final SyncStatus status;
  final int retryCount;
  /// Detected student code - from engine_v2 scan
  final String? studentCode;
  /// Detected version code - from engine_v2 scan
  final String? versionCode;

  const PendingSubmission({
    required this.id,
    required this.examId,
    this.studentId,
    this.classId,
    required this.imageBytes,
    required this.answers,
    required this.score,
    required this.maxScore,
    required this.timestamp,
    this.status = SyncStatus.pending,
    this.retryCount = 0,
    this.studentCode,
    this.versionCode,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'examId': examId,
        'studentId': studentId,
        'classId': classId,
        'imageBytes': base64Encode(imageBytes),
        'answers': answers,
        'score': score,
        'maxScore': maxScore,
        'timestamp': timestamp.toIso8601String(),
        'status': status.name,
        'retryCount': retryCount,
        'studentCode': studentCode,
        'versionCode': versionCode,
      };

  factory PendingSubmission.fromJson(Map<String, dynamic> json) {
    return PendingSubmission(
      id: json['id'] as String,
      examId: json['examId'] as String,
      studentId: json['studentId'] as String?,
      classId: json['classId'] as String?,
      imageBytes: base64Decode(json['imageBytes'] as String),
      answers: Map<String, String>.from(json['answers'] as Map),
      score: (json['score'] as num).toDouble(),
      maxScore: (json['maxScore'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp'] as String),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: json['retryCount'] as int? ?? 0,
      studentCode: json['studentCode'] as String?,
      versionCode: json['versionCode'] as String?,
    );
  }
}

enum SyncStatus { pending, syncing, failed }

/// Local storage for OMR templates and pending submissions (offline support).
class OMRLocalStorage {
  static const String _templatesKey = 'omr_templates';
  static const String _evaluationsKey = 'omr_evaluations';
  static const String _pendingSubmissionsKey = 'omr_pending_submissions';

  final SharedPreferences _prefs;

  OMRLocalStorage({required SharedPreferences prefs}) : _prefs = prefs;

  // --- Template storage ---

  Future<void> saveTemplate(OMRTemplate template) async {
    final templates = await getAllTemplates();
    templates[template.id ?? 'local'] = jsonEncode(_templateToMap(template));
    await _prefs.setString(_templatesKey, jsonEncode(templates));
  }

  Future<OMRTemplate?> getTemplate(String templateId) async {
    final templates = await getAllTemplates();
    final raw = templates[templateId];
    if (raw == null) return null;
    return _templateFromMap(jsonDecode(raw));
  }

  Future<OMRTemplate?> getTemplateForExam(String examId) async {
    final templates = await getAllTemplates();
    for (final entry in templates.entries) {
      final map = jsonDecode(entry.value);
      if (map['examId'] == examId) {
        return _templateFromMap(map);
      }
    }
    return null;
  }

  Future<Map<String, String>> getAllTemplates() async {
    final raw = _prefs.getString(_templatesKey);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) => MapEntry(k, v.toString()));
  }

  Future<void> deleteTemplate(String templateId) async {
    final templates = await getAllTemplates();
    templates.remove(templateId);
    await _prefs.setString(_templatesKey, jsonEncode(templates));
  }

  // --- Evaluation config storage ---

  Future<void> saveEvaluation(String examId, EvaluationConfig eval_) async {
    final evals = await _getAllEvaluations();
    evals[examId] = jsonEncode(_evalToMap(eval_));
    await _prefs.setString(_evaluationsKey, jsonEncode(evals));
  }

  Future<EvaluationConfig?> getEvaluation(String examId) async {
    final evals = await _getAllEvaluations();
    final raw = evals[examId];
    if (raw == null) return null;
    return _evalFromMap(jsonDecode(raw));
  }

  Future<Map<String, String>> _getAllEvaluations() async {
    final raw = _prefs.getString(_evaluationsKey);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) => MapEntry(k, v.toString()));
  }

  // --- Pending submissions (offline queue) ---

  /// Add a pending submission to local storage.
  Future<void> addPendingSubmission(PendingSubmission submission) async {
    final key = _pendingSubmissionsKey;
    final existing = await getPendingSubmissions();
    existing.add(submission);
    final jsonList = existing.map((s) => s.toJson()).toList();
    await _prefs.setString(key, jsonEncode(jsonList));
  }

  /// Get all pending submissions.
  Future<List<PendingSubmission>> getPendingSubmissions() async {
    final key = _pendingSubmissionsKey;
    final raw = _prefs.getString(key);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list
        .map((e) => PendingSubmission.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Update status of a submission.
  Future<void> updateSubmissionStatus(
    String id,
    SyncStatus status, {
    int? retryCount,
  }) async {
    final submissions = await getPendingSubmissions();
    final idx = submissions.indexWhere((s) => s.id == id);
    if (idx == -1) return;

    submissions[idx] = PendingSubmission(
      id: submissions[idx].id,
      examId: submissions[idx].examId,
      studentId: submissions[idx].studentId,
      classId: submissions[idx].classId,
      imageBytes: submissions[idx].imageBytes,
      answers: submissions[idx].answers,
      score: submissions[idx].score,
      maxScore: submissions[idx].maxScore,
      timestamp: submissions[idx].timestamp,
      status: status,
      retryCount: retryCount ?? submissions[idx].retryCount,
    );

    final key = _pendingSubmissionsKey;
    final jsonList = submissions.map((s) => s.toJson()).toList();
    await _prefs.setString(key, jsonEncode(jsonList));
  }

  /// Remove a submission after successful sync.
  Future<void> removePendingSubmission(String id) async {
    final submissions = await getPendingSubmissions();
    submissions.removeWhere((s) => s.id == id);
    final key = _pendingSubmissionsKey;
    final jsonList = submissions.map((s) => s.toJson()).toList();
    await _prefs.setString(key, jsonEncode(jsonList));
  }

  /// Get pending submission count.
  Future<int> getPendingSubmissionCount() async {
    final submissions = await getPendingSubmissions();
    return submissions.length;
  }

  // --- Serialization helpers ---

  Map<String, dynamic> _templateToMap(OMRTemplate t) => {
    'id': t.id,
    'name': t.name,
    'pageWidth': t.pageWidth,
    'pageHeight': t.pageHeight,
    'bubbleWidth': t.bubbleWidth,
    'bubbleHeight': t.bubbleHeight,
    'emptyValue': t.emptyValue,
    'outputColumns': t.outputColumns,
    'customLabels': t.customLabels,
    // fieldBlocks serialized separately as simplified map
    'fieldBlocksRaw': t.fieldBlocks.map((fb) => {
      'name': fb.name,
      'originX': fb.originX,
      'originY': fb.originY,
      'blockWidth': fb.blockWidth,
      'blockHeight': fb.blockHeight,
      'bubbleWidth': fb.bubbleWidth,
      'bubbleHeight': fb.bubbleHeight,
      'bubblesGap': fb.bubblesGap,
      'labelsGap': fb.labelsGap,
      'direction': fb.direction.name,
      'fieldType': fb.fieldType.key,
      'fieldLabels': fb.fieldLabels,
      'bubbleValues': fb.bubbleValues,
      'emptyValue': fb.emptyValue,
    }).toList(),
  };

  OMRTemplate _templateFromMap(Map<String, dynamic> m) {
    final fieldBlocks = (m['fieldBlocksRaw'] as List<dynamic>).map((fbRaw) {
      final fb = fbRaw as Map<String, dynamic>;
      return FieldBlock.fromConfig(
        name: fb['name'] as String,
        config: {
          'origin': [fb['originX'], fb['originY']],
          'bubbleWidth': fb['bubbleWidth'],
          'bubbleHeight': fb['bubbleHeight'],
          'bubblesGap': fb['bubblesGap'],
          'labelsGap': fb['labelsGap'],
          'fieldType': fb['fieldType'],
          'direction': fb['direction'],
          'fieldLabels': fb['fieldLabels'],
          'bubbleValues': fb['bubbleValues'],
          'emptyValue': fb['emptyValue'],
        },
        globalBubbleWidth: fb['bubbleWidth'] as int,
        globalBubbleHeight: fb['bubbleHeight'] as int,
        globalEmptyValue: fb['emptyValue'] as String? ?? '',
      );
    }).toList();

    final customLabels = <String, List<String>>{};
    final clRaw = m['customLabels'] as Map<String, dynamic>?;
    if (clRaw != null) {
      for (final entry in clRaw.entries) {
        customLabels[entry.key] = (entry.value as List<dynamic>).map((e) => e.toString()).toList();
      }
    }

    return OMRTemplate(
      id: m['id'] as String?,
      name: m['name'] as String? ?? 'Template',
      pageWidth: m['pageWidth'] as int? ?? 2480,
      pageHeight: m['pageHeight'] as int? ?? 3508,
      bubbleWidth: m['bubbleWidth'] as int? ?? 35,
      bubbleHeight: m['bubbleHeight'] as int? ?? 35,
      emptyValue: m['emptyValue'] as String? ?? '',
      outputColumns: (m['outputColumns'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      fieldBlocks: fieldBlocks,
      customLabels: customLabels,
      preProcessors: [],
    );
  }

  Map<String, dynamic> _evalToMap(EvaluationConfig e) => {
    'questionsInOrder': e.questionsInOrder,
    'answersInOrder': e.answersInOrder,
    'defaultCorrect': e.defaultScheme.correct,
    'defaultIncorrect': e.defaultScheme.incorrect,
    'defaultUnmarked': e.defaultScheme.unmarked,
  };

  EvaluationConfig _evalFromMap(Map<String, dynamic> m) {
    final qa = <String, String>{};
    final questions = (m['questionsInOrder'] as List<dynamic>).map((e) => e.toString()).toList();
    final answers = m['answersInOrder'] as List<dynamic>;
    for (int i = 0; i < questions.length; i++) {
      qa[questions[i]] = answers[i].toString();
    }
    return EvaluationConfig.simple(
      questionAnswers: qa,
      correct: (m['defaultCorrect'] as num?)?.toDouble() ?? 1.0,
      incorrect: (m['defaultIncorrect'] as num?)?.toDouble() ?? 0.0,
      unmarked: (m['defaultUnmarked'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
