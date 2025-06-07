import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/utils/translations';
import { Phone, MapPin, Clock, User, Navigation } from 'lucide-react';
import GoogleMap from '@/components/GoogleMap';

interface EmployeeLocationDialogProps {
  open: boolean;
  onClose: () => void;
}

const EmployeeLocationDialog: React.FC<EmployeeLocationDialogProps> = ({ open, onClose }) => {
  const { language, ongoingRequest, userLocation } = useApp();
  const t = useTranslation(language);

  const handleCallEmployee = () => {
    if (ongoingRequest?.employeePhone) {
      window.location.href = `tel:${ongoingRequest.employeePhone}`;
    }
  };

  const handleGetDirections = () => {
    if (ongoingRequest?.employeeLocation) {
      const { lat, lng } = ongoingRequest.employeeLocation;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  if (!ongoingRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {t('employee-location')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Employee Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">
                  {ongoingRequest.employeeName || t('assigned-employee')}
                </h3>
                <p className="text-sm text-blue-700">{t(ongoingRequest.type)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
              <Clock className="h-4 w-4" />
              <span>{t('estimated-arrival')}: 15-20 {t('minutes')}</span>
            </div>
            
            <div className="flex gap-2">
              {ongoingRequest.employeePhone && (
                <Button 
                  onClick={handleCallEmployee}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  {t('call-employee')}
                </Button>
              )}
              
              <Button 
                onClick={handleGetDirections}
                size="sm"
                variant="outline"
                className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Navigation className="h-4 w-4 mr-1" />
                {t('directions')}
              </Button>
            </div>
          </div>

          {/* Live Map */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">{t('live-tracking')}</h4>
            <div className="rounded-lg overflow-hidden border">
              <GoogleMap
                userLocation={userLocation}
                employeeLocation={ongoingRequest.employeeLocation}
                height="300px"
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{t('your-location')}</span>
              </div>
              {ongoingRequest.employeeLocation && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span>{t('employee-location')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('service-status')}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('request-type')}:</span>
                <span className="font-medium">{t(ongoingRequest.type)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('status')}:</span>
                <span className="font-medium text-blue-600">{t(ongoingRequest.status)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('requested-at')}:</span>
                <span className="font-medium">{ongoingRequest.timestamp}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeLocationDialog;