// src/components/ErrorMessage.tsx
import React from 'react';
import { Alert, AlertDescription } from '@components/ui/alert';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <Alert variant="destructive">
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

export default ErrorMessage;