import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Calendar, MapPin, Clock, Users, ArrowRight, Star } from 'lucide-react';
import { api, endpoints, formatDate, formatTime, getRelativeTime } from '../utils/api';

export const Home = () => {
  const { data: eventsData, isLoading } = useQuery(
    'featured-events',
    () => api.get(`${endpoints.events}?limit=6&status=published`),
    {
      select: (response) => response.data.data.events,
    }
  );

  const features = [
    {
      icon: Calendar,
      title: 'Discover Events',
      description: 'Find amazing events happening in your city and around the world.',
    },
    {
      icon: Users,
      title: 'Easy Booking',
      description: 'Book tickets in just a few clicks with our secure payment system.',
    },
    {
      icon: MapPin,
      title: 'Event Management',
      description: 'Create and manage your own events with our powerful tools.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Amazing Events
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Find, book, and create unforgettable experiences
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/events"
                className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100"
              >
                Browse Events
              </Link>
              <Link
                to="/register"
                className="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-primary-600"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose TicketHub?
            </h2>
            <p className="text-lg text-gray-600">
              We make event discovery and management simple and secure
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Events
              </h2>
              <p className="text-lg text-gray-600">
                Discover the most popular events happening now
              </p>
            </div>
            <Link
              to="/events"
              className="btn btn-primary flex items-center"
            >
              View All Events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="card animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsData?.map((event) => (
                <div key={event.id} className="card hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 rounded-t-lg flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-primary-600" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className="badge badge-default">
                        {event.category || 'Event'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(event.start_date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatTime(event.start_date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.venue}, {event.city}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {event.sold_tickets || 0} / {event.total_tickets || 0} sold
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary-600">
                        {getRelativeTime(event.start_date)}
                      </span>
                    </div>
                    
                    <Link
                      to={`/events/${event.id}`}
                      className="btn btn-primary w-full"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Create Your Event?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of organizers who trust TicketHub for their events
          </p>
          <Link
            to="/register"
            className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
};
