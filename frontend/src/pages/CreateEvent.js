import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Plus, Save } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

export const CreateEvent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createEventMutation = useMutation(
    (data) => api.post(endpoints.createEvent, data),
    {
      onSuccess: (response) => {
        toast.success('Event created successfully');
        queryClient.invalidateQueries('events');
        navigate('/my-events');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create event');
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const onSubmit = (data) => {
    createEventMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Event</h1>
          <p className="text-lg text-gray-600">
            Fill in the details to create your event
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    {...register('title', { required: 'Event title is required' })}
                    className="input"
                    placeholder="Enter event title"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="input"
                    placeholder="Describe your event"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      {...register('category')}
                      className="input"
                    >
                      <option value="">Select category</option>
                      <option value="music">Music</option>
                      <option value="sports">Sports</option>
                      <option value="technology">Technology</option>
                      <option value="business">Business</option>
                      <option value="education">Education</option>
                      <option value="entertainment">Entertainment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Attendees
                    </label>
                    <input
                      {...register('maxAttendees', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="input"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    {...register('startDate', { required: 'Start date is required' })}
                    type="datetime-local"
                    className="input"
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date & Time *
                  </label>
                  <input
                    {...register('endDate', { required: 'End date is required' })}
                    type="datetime-local"
                    className="input"
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Name *
                  </label>
                  <input
                    {...register('venue', { required: 'Venue is required' })}
                    className="input"
                    placeholder="Enter venue name"
                  />
                  {errors.venue && (
                    <p className="text-sm text-red-600 mt-1">{errors.venue.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    {...register('address', { required: 'Address is required' })}
                    rows={2}
                    className="input"
                    placeholder="Enter full address"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      {...register('city', { required: 'City is required' })}
                      className="input"
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      {...register('state', { required: 'State is required' })}
                      className="input"
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <input
                      {...register('country', { required: 'Country is required' })}
                      className="input"
                      placeholder="Country"
                    />
                    {errors.country && (
                      <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Image */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Image</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  {...register('imageUrl')}
                  type="url"
                  className="input"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/my-events')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createEventMutation.isLoading}
                className="btn btn-primary"
              >
                {createEventMutation.isLoading ? (
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {createEventMutation.isLoading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
