class OmrBubbleCoords {
  final int x, y, w, h;
  OmrBubbleCoords(this.x, this.y, this.w, this.h);

  factory OmrBubbleCoords.fromJson(Map<String, dynamic> json) {
    return OmrBubbleCoords(
      (json['x'] as num).toInt(),
      (json['y'] as num).toInt(),
      (json['w'] as num).toInt(),
      (json['h'] as num).toInt(),
    );
  }
}

class OmrTemplate {
  final String examId;
  final String versionCode;
  final List<OmrBubbleCoords> studentIdCoords;
  final List<OmrBubbleCoords> versionCodeCoords;
  final Map<String, Map<String, OmrBubbleCoords>> answers;
  final Map<String, String> answerKey;
  final Map<String, double> questionScores;
  final double totalScore;
  final int numberOfQuestions;

  OmrTemplate({
    required this.examId,
    required this.versionCode,
    required this.studentIdCoords,
    required this.versionCodeCoords,
    required this.answers,
    required this.answerKey,
    required this.questionScores,
    required this.totalScore,
    required this.numberOfQuestions,
  });

  factory OmrTemplate.fromJson(Map<String, dynamic> json) {
    final t = json['template'] != null
        ? json['template'] as Map<String, dynamic>
        : json;

    final studentIdCoords = <OmrBubbleCoords>[];
    if (t['studentId'] != null) {
      final sid = t['studentId'];
      if (sid is Map && sid['coords'] != null) {
        for (final c in sid['coords'] as List) {
          studentIdCoords.add(OmrBubbleCoords.fromJson(c as Map<String, dynamic>));
        }
      }
    }

    final versionCodeCoords = <OmrBubbleCoords>[];
    if (t['versionCode'] != null) {
      final vc = t['versionCode'];
      if (vc is Map && vc['coords'] != null) {
        for (final c in vc['coords'] as List) {
          versionCodeCoords.add(OmrBubbleCoords.fromJson(c as Map<String, dynamic>));
        }
      }
    }

    final answers = <String, Map<String, OmrBubbleCoords>>{};
    if (t['answers'] != null) {
      for (final entry in (t['answers'] as Map).entries) {
        answers[entry.key as String] = {};
        for (final opt in (entry.value as Map).entries) {
          answers[entry.key]![opt.key as String] =
              OmrBubbleCoords.fromJson(opt.value as Map<String, dynamic>);
        }
      }
    }

    final questionScores = <String, double>{};
    if (t['questionScores'] != null) {
      for (final entry in (t['questionScores'] as Map).entries) {
        questionScores[entry.key.toString()] = (entry.value as num).toDouble();
      }
    }

    final answerKey = <String, String>{};
    if (t['answerKey'] != null) {
      for (final entry in (t['answerKey'] as Map).entries) {
        answerKey[entry.key.toString()] = entry.value.toString();
      }
    }

    return OmrTemplate(
      examId: t['examId']?.toString() ?? json['examId']?.toString() ?? '',
      versionCode: t['versionCode']?.toString() ?? json['versionCode']?.toString() ?? '',
      studentIdCoords: studentIdCoords,
      versionCodeCoords: versionCodeCoords,
      answers: answers,
      answerKey: answerKey,
      questionScores: questionScores,
      totalScore: (t['totalScore'] as num?)?.toDouble() ?? 10.0,
      numberOfQuestions: (t['numberOfQuestions'] as num?)?.toInt() ?? 0,
    );
  }
}
