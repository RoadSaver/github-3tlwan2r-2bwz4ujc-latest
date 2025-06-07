import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/utils/translations';
import { Clock, CheckCircle, XCircle, Phone, FileText, MapPin, User, Wrench } from 'lucide-react';
import GoogleMap from '@/components/GoogleMap';
import { EmployeeStatusUpdate, EmployeeLocationUpdate } from '@/services/employeeSimulationService';

interface ServiceRequestStatusProps {
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  declineReason: string;
  userLocation: { lat: number; lng: number };
  employeeLocation?: { lat: number; lng: number };
  onContactSupport: () => void;
  onClose: () => void;
  onReviewPriceQuote?: () => void;
  hasPriceQuote?: boolean;
  hasStoredSnapshot?: boolean;
  onShowStoredPriceQuote?: () => void;
  eta?: string | null;
  employeeName?: string;
  employeeStatusUpdates?: EmployeeStatusUpdate[];
  currentEmployeeLocation?: { lat: number; lng: number };
}

const ServiceRequestStatus: React.FC<ServiceRequestStatusProps> = ({
  message,
  status,
  declineReason,
  userLocation,
  employeeLocation,
  onContactSupport,
  onClose,
  onReviewPriceQuote,
  hasPriceQuote = false,
  hasStoredSnapshot = false,
  onShowStoredPriceQuote,
  eta,
  employeeName = '',
  employeeStatusUpdates = [],
  currentEmployeeLocation
}) => {
  const { language } = useApp();
  const t = useTranslation(language);
  const [displayLocation, setDisplayLocation] = useState(employeeLocation);

  // Update display location when current employee location changes
  useEffect(() => {
    if (currentEmployeeLocation) {
      setDisplayLocation(currentEmployeeLocation);
    }
  }, [currentEmployeeLocation]);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'declined':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEmployeeStatusIcon = (statusType: string) => {
    switch (statusType) {
      case 'searching':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'assigned':
        return <User className="h-4 w-4 text-green-600" />;
      case 'en_route':
        return <MapPin className="h-4 w-4 text-blue-600" />;
      case 'arrived':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'working':
        return <Wrench className="h-4 w-4 text-orange-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatETA = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Get the latest status update
  const latestStatus = employeeStatusUpdates.length > 0 
    ? employeeStatusUpdates[employeeStatusUpdates.length - 1] 
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Service Request Status</h2>
        <div className="flex items-center justify-center gap-3">
          {getStatusIcon()}
          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>
        
        {/* Employee information */}
        {employeeName && status !== 'declined' && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              Assigned Employee: <span className="font-medium">{employeeName}</span>
            </p>
          </div>
        )}
        
        {/* Review Price Quote buttons */}
        <div className="mt-4 space-y-2">
          {status === 'pending' && hasPriceQuote && onReviewPriceQuote && (
            <Button 
              onClick={onReviewPriceQuote}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 w-full"
            >
              Review the price and decide
            </Button>
          )}
          
          {hasStoredSnapshot && onShowStoredPriceQuote && (
            <Button 
              onClick={onShowStoredPriceQuote}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-2 w-full flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Stored Price Quote
            </Button>
          )}
        </div>
      </div>

      {/* Employee Status Timeline (Glovo-style) */}
      {employeeStatusUpdates.length > 0 && (
        <div className="bg-secondary rounded-lg p-4">
          <h3 className="font-semibold mb-3">Employee Status</h3>
          <div className="space-y-3">
            {employeeStatusUpdates.map((update, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getEmployeeStatusIcon(update.status)}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium">{update.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(update.timestamp)}
                    {update.estimatedArrival && update.estimatedArrival > 0 && (
                      <span className="ml-2 text-blue-600 font-medium">
                        ETA: {formatETA(update.estimatedArrival)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Details */}
      <div className="bg-secondary rounded-lg p-4">
        <h3 className="font-semibold mb-2">Request Details</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {/* Google Maps showing locations */}
      <div className="bg-secondary rounded-lg p-4">
        <h3 className="font-semibold mb-3">Live Location Tracking</h3>
        <div className="rounded-lg overflow-hidden">
          <GoogleMap
            userLocation={userLocation}
            employeeLocation={displayLocation}
            height="250px"
          />
        </div>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Your location</span>
          </div>
          {displayLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>{employeeName ? `${employeeName}'s location` : 'Employee location'}</span>
            </div>
          )}
          {/* Show ETA from latest status if available */}
          {latestStatus?.estimatedArrival && latestStatus.estimatedArrival > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-700">ETA:</span>
              <span>{formatETA(latestStatus.estimatedArrival)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status-specific content */}
      {status === 'declined' && declineReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Service Unavailable</h3>
          <p className="text-sm text-red-700">{declineReason}</p>
        </div>
      )}

      {status === 'accepted' && latestStatus?.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Service Completed!</h3>
          <p className="text-sm text-green-700">
            Your service has been completed successfully. Thank you for using RoadSaver!
          </p>
        </div>
      )}

      {status === 'accepted' && latestStatus && latestStatus.status !== 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Service In Progress</h3>
          <p className="text-sm text-green-700">
            {employeeName} is handling your request. You can track their progress above.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button 
          onClick={onContactSupport}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Phone className="h-4 w-4" />
          Contact Support
        </Button>
        
        <Button 
          onClick={onClose}
          variant="secondary"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default ServiceRequestStatus;