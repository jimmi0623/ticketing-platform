import React from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Ticket, 
  TrendingUp, 
  BarChart3,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { api, endpoints, formatCurrency } from '../utils/api';

export const AdminDashboard = () => {
  const { data: statsData } = useQuery(
    'admin-stats',
    () => api.get(endpoints.adminStats),
    {
      select: (response) => response.data.data.stats,
    }
  );

  const { data: recentOrders } = useQuery(
    'admin-recent-orders',
    () => api.get(`${endpoints.adminOrders}?limit=5`),
    {
      select: (response) => response.data.data.orders,
    }
  );

  const stats = [
    {
      name: 'Total Users',
      value: statsData?.users?.total_users || 0,
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Events',
      value: statsData?.events?.total_events || 0,
      change: '+8%',
      changeType: 'positive',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(statsData?.orders?.total_revenue || 0),
      change: '+23%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Total Tickets',
      value: statsData?.tickets?.total_tickets || 0,
      change: '+15%',
      changeType: 'positive',
      icon: Ticket,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
          <p className="text-lg text-gray-600">
            Overview of platform statistics and recent activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <p className={`text-sm ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change} from last month
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <a
                  href="/admin/orders"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  View all
                </a>
              </div>
            </div>
            <div className="p-6">
              {recentOrders?.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.event_title}</p>
                        <p className="text-sm text-gray-600">
                          {order.customer_name} • Order #{order.order_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="/admin/users"
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Users className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Users</h3>
                      <p className="text-sm text-gray-600">View and edit users</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/admin/events"
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Calendar className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Manage Events</h3>
                      <p className="text-sm text-gray-600">View and edit events</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/admin/analytics"
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-6 w-6 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Analytics</h3>
                      <p className="text-sm text-gray-600">View detailed reports</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/admin/settings"
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-orange-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Settings</h3>
                      <p className="text-sm text-gray-600">Platform settings</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
