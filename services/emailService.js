const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  verification: (data) => ({
    subject: 'Verify Your Email - Ticketing Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Ticketing Platform!</h2>
        <p>Hi ${data.firstName},</p>
        <p>Thank you for registering with us. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${data.verificationToken}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${process.env.FRONTEND_URL}/verify-email?token=${data.verificationToken}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The Ticketing Platform Team</p>
      </div>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your Password - Ticketing Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${data.firstName},</p>
        <p>You requested to reset your password. Click the button below to set a new password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${data.resetToken}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${process.env.FRONTEND_URL}/reset-password?token=${data.resetToken}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The Ticketing Platform Team</p>
      </div>
    `
  }),

  orderConfirmation: (data) => ({
    subject: `Order Confirmation - ${data.order.order_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${data.order.first_name},</p>
        <p>Thank you for your purchase! Your order has been confirmed.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${data.order.order_number}</p>
          <p><strong>Event:</strong> ${data.order.event_title}</p>
          <p><strong>Total Amount:</strong> $${data.order.total_amount}</p>
          <p><strong>Status:</strong> ${data.order.status}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>Tickets</h3>
          ${data.tickets.map(ticket => `
            <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0;">
              <p><strong>Ticket Code:</strong> ${ticket.ticket_code}</p>
              <p><strong>Attendee:</strong> ${ticket.attendee_name}</p>
              <p><strong>Email:</strong> ${ticket.attendee_email}</p>
            </div>
          `).join('')}
        </div>
        
        <p>Your tickets will be available in your account dashboard.</p>
        <p>Best regards,<br>The Ticketing Platform Team</p>
      </div>
    `
  }),

  ticketReminder: (data) => ({
    subject: `Event Reminder - ${data.event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Reminder</h2>
        <p>Hi ${data.attendeeName},</p>
        <p>This is a reminder that your event is coming up!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>Event Details</h3>
          <p><strong>Event:</strong> ${data.event.title}</p>
          <p><strong>Date:</strong> ${new Date(data.event.start_date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.event.start_date).toLocaleTimeString()}</p>
          <p><strong>Venue:</strong> ${data.event.venue}</p>
          <p><strong>Address:</strong> ${data.event.address}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>Your Ticket</h3>
          <p><strong>Ticket Code:</strong> ${data.ticket.ticket_code}</p>
          <p><strong>Attendee:</strong> ${data.ticket.attendee_name}</p>
        </div>
        
        <p>Please arrive 15 minutes before the event starts.</p>
        <p>Best regards,<br>The Ticketing Platform Team</p>
      </div>
    `
  })
};

// Send email
const sendEmail = async (to, templateName, data) => {
  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const emailContent = template(data);
    
    const mailOptions = {
      from: `"Ticketing Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${templateName}`);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email configuration failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  verifyEmailConfig,
  templates
};
