import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { ModalInfo } from '@/types';

interface ModalProps extends ModalInfo {
  onCancel: () => void;
}

export default function Modal({ 
  title, 
  message, 
  children, 
  onConfirm, 
  onCancel, 
  confirmDisabled, 
  type = 'info' 
}: ModalProps) {
  const Icon = {
    'success': CheckCircle,
    'error': AlertTriangle,
    'confirm': AlertTriangle,
    'info': AlertCircle,
  }[type];

  const colorClasses = {
    'success': 'text-green-500',
    'error': 'text-red-500',
    'confirm': 'text-yellow-500',
    'info': 'text-blue-500',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm transform transition-all">
        <div className="flex flex-col items-center text-center">
          {Icon && (
            <div className={`mb-4 ${colorClasses[type]}`}>
              <Icon size={24} />
            </div>
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          {message && <p className="text-sm text-gray-600 mb-6">{message}</p>}
          {children}
          <div className="flex justify-center gap-4 w-full mt-6">
            {onConfirm && (
              <button 
                onClick={onConfirm} 
                disabled={confirmDisabled} 
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
                data-testid="button-confirm"
              >
                확인
              </button>
            )}
            <button 
              onClick={onCancel} 
              className={`w-full px-4 py-2 rounded-md ${
                onConfirm ? 'bg-gray-200 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              data-testid="button-cancel"
            >
              {onConfirm ? '취소' : '닫기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
