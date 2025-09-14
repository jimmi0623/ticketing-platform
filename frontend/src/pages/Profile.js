import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Mail, Phone, MapPin, Save, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery(
    'profile',
    () => api.get(endpoints.profile),
    {
      select: (response) => response.data.data.user,
    }
  );

  const updateProfileMutation = useMutation(
    (data) => api.put(endpoints.updateProfile, data),
    {
      onSuccess: (response) => {
        updateUser(response.data.data.user);
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const changePasswordMutation = useMutation(
    (data) => api.put(endpoints.changePassword, data),
    {
      onSuccess: () => {
        toast.success('Password changed successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to change password');
      },
    }
  );

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: profileData || {},
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm();

  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate(data);
    resetPassword();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile Settings</h1>
          <p className="text-lg text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <User className="h-6 w-6 text-primary-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    {...registerProfile('firstName', { required: 'First name is required' })}
                    className="input"
                    placeholder="First name"
                  />
                  {profileErrors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{profileErrors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    {...registerProfile('lastName', { required: 'Last name is required' })}
                    className="input"
                    placeholder="Last name"
                  />
                  {profileErrors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{profileErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData?.email || ''}
                  disabled
                  className="input bg-gray-50"
                />
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  {...registerProfile('phone')}
                  type="tel"
                  className="input"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...registerProfile('address')}
                  rows={3}
                  className="input"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    {...registerProfile('city')}
                    className="input"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    {...registerProfile('state')}
                    className="input"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    {...registerProfile('country')}
                    className="input"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    {...registerProfile('postalCode')}
                    className="input"
                    placeholder="Postal code"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {updateProfileMutation.isLoading ? (
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Key className="h-6 w-6 text-primary-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  {...registerPassword('currentPassword', { required: 'Current password is required' })}
                  type="password"
                  className="input"
                  placeholder="Current password"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  {...registerPassword('newPassword', { 
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  type="password"
                  className="input"
                  placeholder="New password"
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  {...registerPassword('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: (value, formValues) => 
                      value === formValues.newPassword || 'Passwords do not match'
                  })}
                  type="password"
                  className="input"
                  placeholder="Confirm new password"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={changePasswordMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {changePasswordMutation.isLoading ? (
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
