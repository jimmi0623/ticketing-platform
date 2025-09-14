import React from 'react';
import { useQuery } from 'react-query';
import { Ticket, Calendar, MapPin, Clock, QrCode } from 'lucide-react';
import { api, endpoints, formatDate, formatTime } from '../utils/api';

export const MyTickets = () => {
  const { data: ticketsData, isLoading } = useQuery(
    'my-tickets',
    () => api.get(endpoints.myTickets),
    {
      select: (response) => response.data.data.tickets,
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Tickets</h1>
          <p className="text-lg text-gray-600">
            Manage and view all your event tickets
          </p>
        </div>

        {ticketsData?.length > 0 ? (
          <div className="grid gap-6">
            {ticketsData.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start">
                    <Ticket className="h-6 w-6 text-primary-600 mr-3 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.event_title}</h3>
                      <p className="text-sm text-gray-600">{ticket.tier_name}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ticket.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : ticket.status === 'used'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(ticket.start_date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatTime(ticket.start_date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {ticket.venue}, {ticket.city}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Attendee:</span> {ticket.attendee_name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {ticket.attendee_email}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Ticket Code:</span>
                      <span className="font-mono ml-1">{ticket.ticket_code}</span>
                    </p>
                  </div>
                </div>

                {ticket.qr_code && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-center">
                      <img
                        src={ticket.qr_code}
                        alt="QR Code"
                        className="h-32 w-32"
                      />
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      Show this QR code at the event entrance
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't purchased any tickets yet. Start exploring events!
            </p>
            <a
              href="/events"
              className="btn btn-primary"
            >
              Browse Events
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
