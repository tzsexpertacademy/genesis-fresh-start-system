import React, { useState } from 'react';
import { sendTextMessage } from '../../services/whatsappService';

interface SimpleMessageFormProps {
  onClose: () => void;
}

const SimpleMessageForm = ({ onClose }: SimpleMessageFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !message) return;

    setLoading(true);
    try {
      const result = await sendTextMessage(phoneNumber, message);
      if (result.status) {
        alert('Message sent successfully!');
        setPhoneNumber('');
        setMessage('');
        onClose();
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">Send Message</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6.5">
        <div className="mb-4.5">
          <label className="mb-2.5 block text-black dark:text-white">
            Phone Number
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            disabled={loading}
          />
        </div>
        <div className="mb-6">
          <label className="mb-2.5 block text-black dark:text-white">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message"
            rows={4}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            disabled={loading}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !phoneNumber || !message}
            className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex w-full justify-center rounded border border-stroke p-3 font-medium text-black dark:border-strokedark dark:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimpleMessageForm;