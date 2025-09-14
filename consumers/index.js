const { consumeMessages } = require('../config/rabbitmq');
const {
  processEmailNotification,
  processAnalytics,
  processTicketGeneration,
  processPaymentWebhook,
  scheduleTicketReminders,
  cleanupExpiredData
} = require('../services/messageProcessors');

// Start all message consumers
const startConsumers = async () => {
  try {
    console.log('🔄 Starting message consumers...');
    
    // Email notifications consumer
    await consumeMessages('email_notifications', processEmailNotification);
    
    // Analytics processing consumer
    await consumeMessages('analytics_processing', processAnalytics);
    
    // Ticket generation consumer
    await consumeMessages('ticket_generation', processTicketGeneration);
    
    // Payment webhooks consumer
    await consumeMessages('payment_webhooks', processPaymentWebhook);
    
    console.log('✅ All message consumers started successfully');
  } catch (error) {
    console.error('❌ Error starting message consumers:', error);
    throw error;
  }
};

// Schedule periodic tasks
const startScheduledTasks = () => {
  // Schedule ticket reminders every hour
  setInterval(async () => {
    try {
      await scheduleTicketReminders();
    } catch (error) {
      console.error('Error scheduling ticket reminders:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  // Cleanup expired data every 6 hours
  setInterval(async () => {
    try {
      await cleanupExpiredData();
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
  
  console.log('⏰ Scheduled tasks started');
};

module.exports = {
  startConsumers,
  startScheduledTasks
};
