import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, DollarSign, Eye, Edit, Trash2 } from 'lucide-react';
import { api, endpoints, formatDate, formatTime, formatCurrency } from '../utils/api';

export const MyEvents = () => {
  const { data: eventsData, isLoading } = useQuery(
    'my-events',
    () => api.get(endpoints.myEvents),
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Events</h1>
            <p className="text-lg text-gray-600">
              Manage your created events
            </p>
          </div>
          <Link
            to="/create-event"
            className="btn btn-primary"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Event
          </Link>
        </div>

        {eventsData?.events?.length > 0 ? (
          <div className="grid gap-6">
            {eventsData.events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(event.start_date)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(event.start_date)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.venue}, {event.city}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'published' 
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : event.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{event.ticket_tiers_count || 0}</p>
                    <p className="text-sm text-gray-600">Ticket Tiers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{event.total_tickets || 0}</p>
                    <p className="text-sm text-gray-600">Total Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{event.sold_tickets || 0}</p>
                    <p className="text-sm text-gray-600">Sold Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(event.total_revenue || 0)}</p>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Link
                      to={`/events/${event.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                    <button className="btn btn-outline btn-sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button className="btn btn-outline btn-sm text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(event.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't created any events yet. Start by creating your first event!
            </p>
            <Link
              to="/create-event"
              className="btn btn-primary"
            >
              Create Your First Event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
