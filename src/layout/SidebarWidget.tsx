
import { BoxCubeIcon, PageIcon, CalenderIcon, UserCircleIcon, DollarLineIcon } from "../icons";

export default function SidebarWidget() {
  // Define features with icons
  const features = [
    { icon: <BoxCubeIcon className="w-4 h-4" />, text: "Send text messages" },
    { icon: <PageIcon className="w-4 h-4" />, text: "Send media files" },
    { icon: <CalenderIcon className="w-4 h-4" />, text: "Receive messages" },
    { icon: <UserCircleIcon className="w-4 h-4" />, text: "Auto-reply" },
    { icon: <DollarLineIcon className="w-4 h-4" />, text: "Activity logging" }
  ];
  
  return (
    <div
      className="mx-auto mb-8 w-full max-w-60 rounded-xl bg-gray-50 px-4 py-5 shadow-theme-xs dark:bg-white/[0.03]"
    >
      <div className="flex flex-col">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 tracking-tight dark:text-white">
            WhatsApp Gateway
          </h3>
        </div>
  
        <div className="mb-4">
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-left">
                <span className="mr-2 text-brand-500 dark:text-brand-400">{feature.icon}</span>
                <span className="text-gray-600 text-xs dark:text-gray-400">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
  
        <a
          href="https://www.threads.com/@ori_fin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2 font-medium rounded-lg bg-warning-300 text-gray-800 text-theme-sm hover:bg-warning-400 transition-colors"
        >
          Support Me
        </a>
      </div>
    </div>
  );
  }