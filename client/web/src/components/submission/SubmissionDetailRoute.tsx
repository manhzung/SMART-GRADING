import React from 'react';
import { useParams } from 'react-router-dom';
import { SubmissionDetailPage } from './SubmissionDetailPage';

export const SubmissionDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div data-testid="loading">Loading…</div>;
  return <SubmissionDetailPage submissionId={id} />;
};
