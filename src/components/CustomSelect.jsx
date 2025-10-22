import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const CustomSelect = ({ options, value, onChange, placeholder, icon: Icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        className="flex items-center justify-between w-full pl-3 pr-10 py-2.5 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white text-gray-900 transition-colors shadow-sm dark:bg-gray-200 dark:text-gray-900"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center text-gray-900 dark:text-gray-200">
          {Icon && <Icon className="mr-2 text-amber-500" />}
          {displayValue}
        </span>
        <FaChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm overflow-auto max-h-60"
          tabIndex="-1"
          role="listbox"
          aria-labelledby="listbox-label"
        >
          {options.map((option) => (
            <li
              key={option.value}
              className={`cursor-default select-none relative py-2 pl-3 pr-9 text-gray-900 dark:text-gray-200 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white`}
              id={`listbox-option-${option.value}`}
              role="option"
              onClick={() => handleSelect(option.value)}
            >
              <span className="block truncate text-gray-900 dark:text-gray-200">
                {option.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;