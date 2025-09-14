import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { CheckCircle, Ticket, Calendar, MapPin, Clock } from 'lucide-react';
import { api, endpoints, formatDate, formatTime } from '../utils/api';

export const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [isLoading, setIsLoading] = useState(true);

  const { data: orderData, error } = useQuery(
    ['order', orderId],
    () => api.get(endpoints.orderDetail(orderId)),
    {
      select: (response) => response.data.data.order,
      enabled: !!orderId,
      retry: 3,
    }
  );

  useEffect(() => {
    if (orderData || error) {
      setIsLoading(false);
    }
  }, [orderData, error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-4">We couldn't find the order you're looking for.</p>
          <Link
            to="/my-orders"
            className="btn btn-primary"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your order has been confirmed and tickets have been generated.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-green-800">
                Order Confirmed
              </h2>
            </div>
          </div>

          <div className="p-6">
            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Order Information
                </h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Order Number:</span> {orderData.order_number}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Order Date:</span> {formatDate(orderData.created_at)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {orderData.status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Event Information
                </h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Event:</span> {orderData.event_title}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Date:</span> {formatDate(orderData.start_date)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Time:</span> {formatTime(orderData.start_date)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Venue:</span> {orderData.venue}, {orderData.city}
                  </p>
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Tickets</h3>
              <div className="space-y-4">
                {orderData.tickets?.map((ticket) => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Ticket className="h-5 w-5 text-primary-600 mr-2" />
                        <span className="font-medium text-gray-900">{ticket.tier_name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-500">
                        ${ticket.price}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><span className="font-medium">Attendee:</span> {ticket.attendee_name}</p>
                      <p><span className="font-medium">Email:</span> {ticket.attendee_email}</p>
                      <p><span className="font-medium">Ticket Code:</span> 
                        <span className="font-mono ml-1">{ticket.ticket_code}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Paid</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${orderData.total_amount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">What's Next?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Your tickets have been sent to your email address</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">You can view and manage your tickets in your account</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Bring a valid ID and your ticket to the event</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/my-tickets"
            className="btn btn-primary btn-lg"
          >
            View My Tickets
          </Link>
          <Link
            to="/events"
            className="btn btn-outline btn-lg"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
};
