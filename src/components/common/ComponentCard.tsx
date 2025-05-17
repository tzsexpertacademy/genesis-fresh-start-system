import { ReactNode } from "react";

interface ComponentCardProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

const ComponentCard = ({ title, className = "", children }: ComponentCardProps) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-none dark:border-gray-800 dark:bg-gray-900 sm:p-6 ${className}`}>
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default ComponentCard;