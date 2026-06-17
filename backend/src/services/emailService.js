import nodemailer from 'nodemailer';

// Abstracted Email Provider
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Configure production SMTP (e.g., SendGrid, AWS SES)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development mode: Use a fake SMTP service or console logging
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.DEV_SMTP_USER || 'fake_user',
      pass: process.env.DEV_SMTP_PASS || 'fake_pass',
    },
  });
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@coursefinder.app',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 Development Email sent to ${to}: ${nodemailer.getTestMessageUrl(info) || 'Check console'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendVerificationEmail = async (userEmail, token) => {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const html = `
    <h1>Welcome to Course Finder!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verifyUrl}">Verify Email</a>
    <p>If you did not request this, please ignore this email.</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Verify Your Email - Course Finder',
    html,
  });
};

export const sendPasswordResetEmail = async (userEmail, token) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Password Reset - Course Finder',
    html,
  });
};
