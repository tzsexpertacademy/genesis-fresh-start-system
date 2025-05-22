import * as scheduleService from '../services/scheduleService.js';

// Get all scheduled messages
export const getScheduledMessages = (req, res) => {
  try {
    const messages = scheduleService.getAllScheduledMessages();
    res.json({
      status: true,
      message: 'Scheduled messages retrieved successfully',
      data: {
        messages,
      },
    });
  } catch (error) {
    console.error('Error getting scheduled messages:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to get scheduled messages',
      error: error.message,
    });
  }
};

// Schedule a new message
export const scheduleMessage = (req, res) => {
  try {
    const { number, message, scheduleTime } = req.body;

    if (!number || !message || !scheduleTime) {
      return res.status(400).json({
        status: false,
        message: 'Number, message, and scheduleTime are required',
      });
    }

    // Validate number (should start with country code, no +)
    if (!/^\d+$/.test(number)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid number format. Number should contain only digits and start with country code (e.g., 62812345678)',
      });
    }

    // Validate scheduleTime is a future date
    const scheduledDate = new Date(scheduleTime);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({
            status: false,
            message: 'scheduleTime must be a valid date and in the future',
        });
    }


    const scheduledMessage = scheduleService.addScheduledMessage({
      number,
      message,
      scheduleTime,
    });

    res.status(201).json({
      status: true,
      message: 'Message scheduled successfully',
      data: {
        scheduledMessage,
      },
    });
  } catch (error) {
    console.error('Error scheduling message:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to schedule message',
      error: error.message,
    });
  }
};

// Delete a scheduled message
export const deleteScheduledMessage = (req, res) => {
  try {
    const { id } = req.params;

    const deleted = scheduleService.deleteScheduledMessage(id);

    if (deleted) {
      res.json({
        status: true,
        message: 'Scheduled message deleted successfully',
      });
    } else {
      res.status(404).json({
        status: false,
        message: 'Scheduled message not found',
      });
    }
  } catch (error) {
    console.error('Error deleting scheduled message:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete scheduled message',
      error: error.message,
    });
  }
};