import React from "react";
import { ReactComponent as PlusIcon } from "./plus.svg?react";
import { ReactComponent as CloseIcon } from "./close.svg?react";
import { ReactComponent as BoxIcon } from "./box.svg?react";
import { ReactComponent as CheckCircleIcon } from "./check-circle.svg?react";
import { ReactComponent as AlertIcon } from "./alert.svg?react";
import { ReactComponent as InfoIcon } from "./info.svg?react";
import { ReactComponent as ErrorIcon } from "./info-error.svg?react";
import { ReactComponent as BoltIcon } from "./bolt.svg?react";
import { ReactComponent as ArrowUpIcon } from "./arrow-up.svg?react";
import { ReactComponent as ArrowDownIcon } from "./arrow-down.svg?react";
import { ReactComponent as FolderIcon } from "./folder.svg?react";
import { ReactComponent as VideoIcon } from "./videos.svg?react";
import { ReactComponent as AudioIcon } from "./audio.svg?react";
import { ReactComponent as GridIcon } from "./grid.svg?react";
import { ReactComponent as FileIcon } from "./file.svg?react";
import { ReactComponent as DownloadIcon } from "./download.svg?react";
import { ReactComponent as ArrowRightIcon } from "./arrow-right.svg?react";
import { ReactComponent as GroupIcon } from "./group.svg?react";
import { ReactComponent as BoxIconLine } from "./box-line.svg?react";
import { ReactComponent as ShootingStarIcon } from "./shooting-star.svg?react";
import { ReactComponent as DollarLineIcon } from "./dollar-line.svg?react";
import { ReactComponent as TrashBinIcon } from "./trash.svg?react";
import { ReactComponent as AngleUpIcon } from "./angle-up.svg?react";
import { ReactComponent as AngleDownIcon } from "./angle-down.svg?react";
import { ReactComponent as PencilIcon } from "./pencil.svg?react";
import { ReactComponent as CheckLineIcon } from "./check-line.svg?react";
import { ReactComponent as CloseLineIcon } from "./close-line.svg?react";
import { ReactComponent as ChevronDownIcon } from "./chevron-down.svg?react";
import { ReactComponent as ChevronUpIcon } from "./chevron-up.svg?react";
import { ReactComponent as PaperPlaneIcon } from "./paper-plane.svg?react";
import { ReactComponent as LockIcon } from "./lock.svg?react";
import { ReactComponent as EnvelopeIcon } from "./envelope.svg?react";
import { ReactComponent as UserIcon } from "./user-line.svg?react";
import { ReactComponent as CalenderIcon } from "./calender-line.svg?react";
import { ReactComponent as EyeIcon } from "./eye.svg?react";
import { ReactComponent as EyeCloseIcon } from "./eye-close.svg?react";
import { ReactComponent as TimeIcon } from "./time.svg?react";
import { ReactComponent as CopyIcon } from "./copy.svg?react";
import { ReactComponent as ChevronLeftIcon } from "./chevron-left.svg?react";
import { ReactComponent as UserCircleIcon } from "./user-circle.svg?react";
import { ReactComponent as TaskIcon } from "./task-icon.svg?react";
import { ReactComponent as ListIcon } from "./list.svg?react";
import { ReactComponent as TableIcon } from "./table.svg?react";
import { ReactComponent as PageIcon } from "./page.svg?react";
import { ReactComponent as PieChartIcon } from "./pie-chart.svg?react";
import { ReactComponent as BoxCubeIcon } from "./box-cube.svg?react";
import { ReactComponent as PlugInIcon } from "./plug-in.svg?react";
import { ReactComponent as DocsIcon } from "./docs.svg?react";
import { ReactComponent as MailIcon } from "./mail-line.svg?react";
import { ReactComponent as HorizontaLDots } from "./horizontal-dots.svg?react";
import { ReactComponent as ChatIcon } from "./chat.svg?react";
import GeminiIcon from "./GeminiIcon";
import { ReactComponent as MoreDotIcon } from "./moredot.svg?react";
import { ReactComponent as AlertHexaIcon } from "./alert-hexa.svg?react";
import { ReactComponent as ErrorHexaIcon } from "./info-hexa.svg?react";
import { WhatsAppIcon } from "./SidebarIcons";

// Create missing icons for EcommerceMetrics component
// LineChartUp icon
const LineChartUp: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 7L13 15L9 11L3 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12V7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ShoppingBag icon
const ShoppingBag: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Users icon
const Users: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// CreditCard icon
const CreditCard: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 10H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export {
  ErrorHexaIcon,
  AlertHexaIcon,
  MoreDotIcon,
  DownloadIcon,
  FileIcon,
  GridIcon,
  AudioIcon,
  VideoIcon,
  BoltIcon,
  PlusIcon,
  BoxIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertIcon,
  InfoIcon,
  ErrorIcon,
  ArrowUpIcon,
  FolderIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  GroupIcon,
  BoxIconLine,
  ShootingStarIcon,
  DollarLineIcon,
  TrashBinIcon,
  AngleUpIcon,
  AngleDownIcon,
  PencilIcon,
  CheckLineIcon,
  CloseLineIcon,
  ChevronDownIcon,
  PaperPlaneIcon,
  EnvelopeIcon,
  LockIcon,
  UserIcon,
  CalenderIcon,
  EyeIcon,
  EyeCloseIcon,
  TimeIcon,
  CopyIcon,
  ChevronLeftIcon,
  UserCircleIcon,
  TaskIcon,
  ListIcon,
  TableIcon,
  PageIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
  DocsIcon,
  MailIcon,
  HorizontaLDots,
  ChevronUpIcon,
  ChatIcon,
  GeminiIcon,
  WhatsAppIcon,
  // Add missing exports for EcommerceMetrics component
  LineChartUp,
  ShoppingBag,
  Users,
  CreditCard,
};