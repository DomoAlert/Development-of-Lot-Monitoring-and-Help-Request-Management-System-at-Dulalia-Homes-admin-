import React from 'react';
import { cardStyles, buttonStyles, tableStyles, statCardStyles, badgeStyles } from '../styles/adminStyles';
import { FaTimes } from 'react-icons/fa';

/**
 * Card component for admin pages
 */
export const Card = ({ children, className = "", ...props }) => {
  return (
    <div className={`${cardStyles.default} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Card header component
 */
export const CardHeader = ({ title, icon, actions, className = "", ...props }) => {
  return (
    <div className={`${cardStyles.header} ${className} flex justify-between items-center`} {...props}>
      <div className="flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        <h3 className={cardStyles.headerTitle}>{title}</h3>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};

/**
 * Card body component
 */
export const CardBody = ({ children, className = "", ...props }) => {
  return (
    <div className={`${cardStyles.body} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Card footer component
 */
export const CardFooter = ({ children, className = "", ...props }) => {
  return (
    <div className={`${cardStyles.footer} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Button component
 */
export const Button = ({ 
  children, 
  variant = "primary",
  size = "md", 
  disabled = false,
  className = "",
  ...props 
}) => {
  const variantClass = buttonStyles[variant] || buttonStyles.primary;
  const sizeClass = buttonStyles.sizes[size] || buttonStyles.sizes.md;
  const disabledClass = disabled ? buttonStyles.disabled : "";

  return (
    <button 
      className={`${buttonStyles.base} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * IconButton component
 */
export const IconButton = ({ 
  icon, 
  variant = "icon",
  size = "md", 
  disabled = false,
  className = "",
  ...props 
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      className={`${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
};

/**
 * Table component
 */
export const Table = ({ children, className = "", ...props }) => {
  return (
    <div className={`${tableStyles.wrapper}`}>
      <table className={`${tableStyles.table} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

/**
 * Table header component
 */
export const TableHead = ({ children, className = "", ...props }) => {
  return (
    <thead className={`${tableStyles.tableHeader} ${className}`} {...props}>
      {children}
    </thead>
  );
};

/**
 * Table body component
 */
export const TableBody = ({ children, className = "", ...props }) => {
  return (
    <tbody className={`${tableStyles.tableBody} ${className}`} {...props}>
      {children}
    </tbody>
  );
};

/**
 * Table row component
 */
export const TableRow = ({ children, striped = false, className = "", ...props }) => {
  const stripedClass = striped ? tableStyles.tableRowStriped : "";
  return (
    <tr className={`${tableStyles.tableRow} ${stripedClass} ${className}`} {...props}>
      {children}
    </tr>
  );
};

/**
 * Table cell component
 */
export const TableCell = ({ children, className = "", ...props }) => {
  return (
    <td className={`${tableStyles.tableCell} ${className}`} {...props}>
      {children}
    </td>
  );
};

/**
 * Table header cell component
 */
export const TableHeaderCell = ({ children, className = "", ...props }) => {
  return (
    <th className={`${tableStyles.tableHeaderCell} ${className}`} {...props}>
      {children}
    </th>
  );
};

/**
 * StatCard component for dashboard stats
 */
export const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendValue,
  trendText,
  iconColor = "primary",
  className = "", 
  ...props 
}) => {
  const colorVariants = {
    primary: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300",
    secondary: "bg-secondary/10 text-yellow-800 dark:bg-secondary/20 dark:text-yellow-300",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const iconColorClass = colorVariants[iconColor] || colorVariants.primary;
  
  return (
    <div className={`${statCardStyles.wrapper} relative ${className}`} {...props}>
      {icon && (
        <div className={`${statCardStyles.iconWrapper} ${iconColorClass} transition-colors duration-200`}>
          {icon}
        </div>
      )}
      <h3 className={statCardStyles.title}>{title}</h3>
      <p className={statCardStyles.value}>{value}</p>
      {description && <p className={statCardStyles.description}>{description}</p>}
      
      {trend && (
        <div className={statCardStyles.footer}>
          <span className={statCardStyles.trend[trend]}>
            {trendValue}
            {trendText && <span className="ml-1">{trendText}</span>}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Badge component
 */
export const Badge = ({ 
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  const variantClass = badgeStyles[variant] || badgeStyles.primary;
  
  return (
    <span className={`${badgeStyles.base} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};

/**
 * Modal component
 */
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = "md",
  className = "", 
  ...props 
}) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4"
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" {...props}>
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClass} w-full ${className}`}>
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200" id="modal-title">
              {title}
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 transition-colors duration-200"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="px-4 py-3 sm:p-6 text-gray-900 dark:text-white transition-colors duration-200">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 dark:border-gray-600 transition-colors duration-200">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Data search component
 */
export const DataSearch = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
  ...props
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary focus:border-primary dark:focus:border-secondary text-sm text-gray-900 dark:text-white transition-colors duration-200"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyPress={(e) => e.key === 'Enter' && onSearch && onSearch()}
        {...props}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
};

export default {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  StatCard,
  Badge,
  Modal,
  DataSearch
};
