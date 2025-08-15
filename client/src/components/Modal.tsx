import { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
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
  type = 'info',
  asset
}: ModalProps) {
  const [deleteMemo, setDeleteMemo] = useState('');

  const Icon = {
    'success': CheckCircle,
    'error': AlertTriangle,
    'confirm': AlertTriangle,
    'info': AlertCircle,
    'delete': Trash2,
  }[type];

  const colorClasses = {
    'success': 'text-green-500',
    'error': 'text-red-500',
    'confirm': 'text-yellow-500',
    'info': 'text-blue-500',
    'delete': 'text-red-500',
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
          {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
          
          {type === 'delete' && asset && (
            <div className="w-full mb-4">
              <div className="bg-gray-50 p-3 rounded-md mb-4 text-left">
                <h4 className="font-medium text-gray-900">삭제할 자산:</h4>
                <p className="text-sm text-gray-600">
                  {asset.name || `${asset.bankName} (${asset.accountHolder})` || `${asset.exchangeName || '바이낸스'} ${asset.coinName}`}
                </p>
              </div>
              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  삭제 사유 (필수) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deleteMemo}
                  onChange={(e) => setDeleteMemo(e.target.value)}
                  placeholder="삭제 사유를 입력해주세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
            </div>
          )}
          
          {children}
          <div className="flex justify-center gap-4 w-full mt-6">
            {onConfirm && (
              <button 
                onClick={() => {
                  if (type === 'delete') {
                    onConfirm(deleteMemo);
                  } else {
                    onConfirm();
                  }
                }}
                disabled={confirmDisabled || (type === 'delete' && !deleteMemo.trim())} 
                className={`w-full px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 ${
                  type === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
                data-testid="button-confirm"
              >
                {type === 'delete' ? '삭제' : '확인'}
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
