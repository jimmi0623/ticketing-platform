import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, Ticket, Eye } from 'lucide-react';
import { api, endpoints, formatDate, formatCurrency } from '../utils/api';

export const MyOrders = () => {
  const { data: ordersData, isLoading } = useQuery(
    'my-orders',
    () => api.get(endpoints.myOrders),
    {
      select: (response) => response.data.data,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-lg text-gray-600">
            View and manage all your ticket orders
          </p>
        </div>

        {ordersData?.orders?.length > 0 ? (
          <div className="space-y-6">
            {ordersData.orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start">
                    <Calendar className="h-6 w-6 text-primary-600 mr-3 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{order.event_title}</h3>
                      <p className="text-sm text-gray-600">Order #{order.order_number}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Ticket className="h-4 w-4 mr-2" />
                    {order.ticket_count} ticket{order.ticket_count !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(order.start_date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {order.venue}, {order.city}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <Link
                    to={`/orders/${order.id}`}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                  {order.status === 'paid' && (
                    <Link
                      to="/my-tickets"
                      className="btn btn-primary btn-sm"
                    >
                      View Tickets
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't made any orders yet. Start exploring events!
            </p>
            <Link
              to="/events"
              className="btn btn-primary"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
