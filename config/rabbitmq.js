const amqp = require('amqplib');
require('dotenv').config();

let connection;
let channel;

const connectRabbitMQ = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('❌ RabbitMQ connection closed');
    });

    channel = await connection.createChannel();
    
    // Declare queues
    await channel.assertQueue('email_notifications', { durable: true });
    await channel.assertQueue('analytics_processing', { durable: true });
    await channel.assertQueue('ticket_generation', { durable: true });
    await channel.assertQueue('payment_webhooks', { durable: true });

    console.log('✅ RabbitMQ connected successfully');
    return { connection, channel };
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
    throw error;
  }
};

const publishMessage = async (queueName, message) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }
    
    await channel.assertQueue(queueName, { durable: true });
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
    
    console.log(`📤 Message published to ${queueName}:`, message);
  } catch (error) {
    console.error('❌ Error publishing message:', error);
    throw error;
  }
};

const consumeMessages = async (queueName, callback) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    await channel.assertQueue(queueName, { durable: true });
    await channel.prefetch(1); // Process one message at a time

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const message = JSON.parse(msg.content.toString());
          await callback(message);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          channel.nack(msg, false, false); // Reject and don't requeue
        }
      }
    });

    console.log(`👂 Listening for messages on ${queueName}`);
  } catch (error) {
    console.error('❌ Error consuming messages:', error);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('✅ RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishMessage,
  consumeMessages,
  closeConnection
};
