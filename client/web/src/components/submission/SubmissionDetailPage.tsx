import React, { useEffect, useState } from 'react';
import { ImageGallery } from './ImageGallery';
import env from '../../config/env';

interface Submission {
  _id: string;
  status?: string;
  totalScore?: number;
  maxScore?: number;
  examId?: { title?: string } | string;
  studentId?: { name?: string; studentCode?: string } | string;
  images?: {
    original?: { url?: string };
    preprocessed?: { url?: string };
    annotated?: { url?: string };
  };
}

interface SubmissionDetailPageProps {
  submissionId: string;
}

const apiBase = env.apiUrl.replace(/\/api\/v1\/?$/, '');

export const SubmissionDetailPage: React.FC<SubmissionDetailPageProps> = ({
  submissionId,
}) => {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    fetch(`${apiBase}/api/v1/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Submission>)
          : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then(setSubmission)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <div data-testid="loading">Loading…</div>;
  if (error) return <div data-testid="error">Error: {error}</div>;
  if (!submission) return <div>Not found</div>;

  const examTitle =
    typeof submission.examId === 'object'
      ? submission.examId?.title
      : null;

  return (
    <div className="submission-detail" data-testid="submission-detail">
      <h1>{examTitle || 'Submission'}</h1>
      <p>Status: {submission.status || 'unknown'}</p>
      <p>
        Score: {submission.totalScore ?? 0} / {submission.maxScore ?? 0}
      </p>
      <ImageGallery
        originalUrl={submission.images?.original?.url}
        annotatedUrl={submission.images?.annotated?.url}
      />
    </div>
  );
};
