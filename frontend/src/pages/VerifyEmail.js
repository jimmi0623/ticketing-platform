import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification, user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('loading');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setVerificationStatus('no-token');
    }
  }, [token]);

  const handleVerification = async () => {
    try {
      const result = await verifyEmail(token);
      setVerificationStatus(result.success ? 'success' : 'error');
    } catch (error) {
      setVerificationStatus('error');
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendVerification();
    } catch (error) {
      // Error is handled in the context
    } finally {
      setIsResending(false);
    }
  };

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {verificationStatus === 'success' ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Email Verified!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Your email has been successfully verified. You can now access all features of the platform.
              </p>
              <Link
                to="/dashboard"
                className="btn btn-primary btn-lg"
              >
                Go to Dashboard
              </Link>
            </>
          ) : verificationStatus === 'error' ? (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Verification Failed
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                The verification link is invalid or has expired. Please request a new verification email.
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="btn btn-primary btn-lg w-full"
                >
                  {isResending ? (
                    <div className="loading-spinner h-4 w-4 mr-2"></div>
                  ) : null}
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <Link
                  to="/login"
                  className="btn btn-outline btn-lg w-full"
                >
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Verify Your Email
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Please check your email and click the verification link to activate your account.
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="btn btn-primary btn-lg w-full"
                >
                  {isResending ? (
                    <div className="loading-spinner h-4 w-4 mr-2"></div>
                  ) : null}
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <Link
                  to="/login"
                  className="btn btn-outline btn-lg w-full"
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
