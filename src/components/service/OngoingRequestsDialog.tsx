import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/utils/translations';
import { Clock, MapPin, Phone, User, CheckCircle, Truck, Wrench, AlertCircle } from 'lucide-react';
import EmployeeLocationDialog from './EmployeeLocationDialog';

interface OngoingRequestsDialogProps {
  open: boolean;
  onClose: () => void;
  onViewRequest: () => void;
  onReviewPriceQuote: () => void;
}

const OngoingRequestsDialog: React.FC<OngoingRequestsDialogProps> = ({ 
  open, 
  onClose, 
  onViewRequest,
  onReviewPriceQuote
}) => {
  const { language, ongoingRequest } = useApp();
  const t = useTranslation(language);
  const [showEmployeeLocation, setShowEmployeeLocation] = useState(false);

  const handleCallEmployee = () => {
    if (ongoingRequest?.employeePhone) {
      window.location.href = `tel:${ongoingRequest.employeePhone}`;
    }
  };

  const openEmployeeLocationDialog = () => {
    setShowEmployeeLocation(true);
  };

  const handleRequestClick = () => {
    onViewRequest();
    onClose();
  };

  const handleReviewPriceQuote = () => {
    onReviewPriceQuote();
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'en_route':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'working':
        return <Wrench className="h-5 w-5 text-orange-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('waiting-for-response');
      case 'accepted':
        return t('employee-assigned');
      case 'en_route':
        return t('employee-on-way');
      case 'working':
        return t('service-in-progress');
      case 'completed':
        return t('service-completed');
      default:
        return t(status);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'accepted':
      case 'en_route':
      case 'working':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('Ongoing Requests')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!ongoingRequest ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('no-active-requests')}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t('no-active-requests-desc')}
                </p>
                <Button onClick={onClose} variant="outline" className="w-full">
                  {t('close')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Request Status Card */}
                <div className={`rounded-lg border-2 p-4 ${getStatusColor(ongoingRequest.status)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ongoingRequest.status)}
                      <span className="font-medium">{getStatusText(ongoingRequest.status)}</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-white rounded-full">
                      {t(ongoingRequest.type)}
                    </span>
                  </div>
                  
                  {ongoingRequest.status === 'pending' && (
                    <p className="text-sm opacity-90">
                      {t('finding-best-employee')}
                    </p>
                  )}
                </div>

                {/* Service Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">{t('service-details')}</h4>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{t('requested-at')}: {ongoingRequest.timestamp}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{ongoingRequest.location}</span>
                  </div>
                </div>

                {/* Employee Information */}
                {ongoingRequest.status === 'accepted' && ongoingRequest.employeeName && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800">{t('your-employee')}</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium text-green-900">{ongoingRequest.employeeName}</p>
                      
                      <div className="flex gap-2">
                        {ongoingRequest.employeePhone && (
                          <Button 
                            onClick={handleCallEmployee}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            {t('call')}
                          </Button>
                        )}
                        
                        <Button 
                          onClick={openEmployeeLocationDialog}
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          {t('track')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Quote Section */}
                {ongoingRequest.status === 'pending' && ongoingRequest.priceQuote !== undefined && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-800">{t('price-quote-received')}</h4>
                      <span className="text-lg font-bold text-blue-900">
                        {ongoingRequest.priceQuote.toFixed(2)} BGN
                      </span>
                    </div>
                    
                    <Button 
                      onClick={handleReviewPriceQuote}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t('review-and-decide')}
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleRequestClick}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('view-details')}
                  </Button>
                  
                  <Button 
                    onClick={onClose}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {t('close')}
                  </Button>
                </div>

                {/* Progress Indicator */}
                {ongoingRequest.status !== 'pending' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{t('request-sent')}</span>
                      <span>{t('employee-assigned')}</span>
                      <span>{t('on-the-way')}</span>
                      <span>{t('completed')}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: ongoingRequest.status === 'accepted' ? '50%' : 
                                ongoingRequest.status === 'en_route' ? '75%' : 
                                ongoingRequest.status === 'completed' ? '100%' : '25%'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Location Dialog */}
      <EmployeeLocationDialog
        open={showEmployeeLocation}
        onClose={() => setShowEmployeeLocation(false)}
      />
    </>
  );
};

export default OngoingRequestsDialog;