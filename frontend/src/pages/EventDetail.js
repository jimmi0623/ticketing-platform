import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Calendar, MapPin, Clock, Users, Ticket, Share2, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, endpoints, formatDate, formatTime, formatDateTime } from '../utils/api';
import toast from 'react-hot-toast';

export const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [selectedTier, setSelectedTier] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const queryClient = useQueryClient();

  const { data: eventData, isLoading, error } = useQuery(
    ['event', id],
    () => api.get(endpoints.eventDetail(id)),
    {
      select: (response) => response.data.data.event,
    }
  );

  const { data: ticketTiersData } = useQuery(
    ['ticket-tiers', id],
    () => api.get(endpoints.ticketTiers(id)),
    {
      select: (response) => response.data.data.tiers,
      enabled: !!eventData,
    }
  );

  const createOrderMutation = useMutation(
    (orderData) => api.post(endpoints.createOrder, orderData),
    {
      onSuccess: (response) => {
        // Redirect to Stripe checkout
        window.location.href = response.data.data.checkoutUrl;
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create order');
      },
    }
  );

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    if (!selectedTier) {
      toast.error('Please select a ticket tier');
      return;
    }

    if (ticketQuantity < 1) {
      toast.error('Please select at least 1 ticket');
      return;
    }

    const orderData = {
      eventId: parseInt(id),
      tickets: [
        {
          tierId: selectedTier.id,
          quantity: ticketQuantity,
          attendeeName: `${user.firstName} ${user.lastName}`,
          attendeeEmail: user.email,
        },
      ],
      billingEmail: user.email,
      billingName: `${user.firstName} ${user.lastName}`,
    };

    createOrderMutation.mutate(orderData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventData?.title,
          text: `Check out this event: ${eventData?.title}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast.success('Event link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Event link copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/events')}
            className="btn btn-primary"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  const availableTiers = ticketTiersData?.filter(tier => 
    tier.is_active && 
    tier.sold_quantity < tier.quantity &&
    (!tier.sales_start_date || new Date(tier.sales_start_date) <= new Date()) &&
    (!tier.sales_end_date || new Date(tier.sales_end_date) >= new Date())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Image */}
            <div className="mb-8">
              {eventData.image_url ? (
                <img
                  src={eventData.image_url}
                  alt={eventData.title}
                  className="w-full h-64 md:h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 md:h-96 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                  <Calendar className="h-24 w-24 text-primary-600" />
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {eventData.title}
                  </h1>
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <span className="badge badge-secondary mr-2">
                      {eventData.category || 'Event'}
                    </span>
                    <span>by {eventData.organizer_name} {eventData.organizer_last_name}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleShare}
                    className="btn btn-outline btn-sm"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Save
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Date & Time</p>
                      <p className="text-gray-600">
                        {formatDateTime(eventData.start_date)}
                      </p>
                      {eventData.end_date && (
                        <p className="text-sm text-gray-500">
                          Ends: {formatDateTime(eventData.end_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-gray-600">{eventData.venue}</p>
                      <p className="text-gray-600">
                        {eventData.address}, {eventData.city}, {eventData.state} {eventData.country}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Capacity</p>
                      <p className="text-gray-600">
                        {eventData.max_attendees ? 
                          `${eventData.max_attendees} attendees` : 
                          'Unlimited'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Ticket className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Tickets Available</p>
                      <p className="text-gray-600">
                        {availableTiers.length} tier{availableTiers.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {eventData.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this event</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {eventData.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Purchase Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Get Tickets</h3>

              {availableTiers.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tickets available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ticket Tiers */}
                  <div className="space-y-3">
                    {availableTiers.map((tier) => (
                      <div
                        key={tier.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedTier?.id === tier.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTier(tier)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{tier.name}</h4>
                          <span className="text-lg font-semibold text-primary-600">
                            ${tier.price}
                          </span>
                        </div>
                        {tier.description && (
                          <p className="text-sm text-gray-600 mb-2">{tier.description}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          {tier.quantity - tier.sold_quantity} remaining
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Quantity Selector */}
                  {selectedTier && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                          className="btn btn-outline btn-sm"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 border border-gray-300 rounded text-center min-w-[3rem]">
                          {ticketQuantity}
                        </span>
                        <button
                          onClick={() => setTicketQuantity(Math.min(selectedTier.quantity - selectedTier.sold_quantity, ticketQuantity + 1))}
                          className="btn btn-outline btn-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Purchase Button */}
                  <button
                    onClick={handlePurchase}
                    disabled={!selectedTier || createOrderMutation.isLoading}
                    className="btn btn-primary w-full btn-lg"
                  >
                    {createOrderMutation.isLoading ? (
                      <div className="loading-spinner h-4 w-4 mr-2"></div>
                    ) : null}
                    {createOrderMutation.isLoading ? 'Processing...' : 'Purchase Tickets'}
                  </button>

                  {/* Total Price */}
                  {selectedTier && (
                    <div className="text-center pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(selectedTier.price * ticketQuantity).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
