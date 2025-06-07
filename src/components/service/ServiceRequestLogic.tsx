import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from "@/components/ui/use-toast";
import { useApp } from '@/contexts/AppContext';
import { serviceMessages } from './constants/serviceMessages';
import { ServiceType } from './types/serviceRequestState';
import { useServiceValidation } from './hooks/useServiceValidation';
import { useRequestActions } from './hooks/useRequestActions';
import { usePriceQuoteSnapshot } from '@/hooks/usePriceQuoteSnapshot';
import { UserHistoryService } from '@/services/userHistoryService';
import { SimulatedEmployeeBlacklistService } from '@/services/simulatedEmployeeBlacklistService';
import { EmployeeSimulationService, EmployeeStatusUpdate, EmployeeLocationUpdate } from '@/services/employeeSimulationService';

export const useServiceRequest = (
  type: ServiceType,
  userLocation: { lat: number; lng: number }
) => {
  const { setOngoingRequest, ongoingRequest, user } = useApp();
  const { validateMessage } = useServiceValidation();
  const {
    handleCancelRequest: cancelRequest,
    handleContactSupport
  } = useRequestActions();
  const { storeSnapshot, loadSnapshot, storedSnapshot, moveToFinished } = usePriceQuoteSnapshot();

  // Initialize states
  const [message, setMessage] = useState(() => serviceMessages[type] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRealTimeUpdate, setShowRealTimeUpdate] = useState(false);
  const [showPriceQuote, setShowPriceQuote] = useState(false);
  const [priceQuote, setPriceQuote] = useState<number>(0);
  const [originalPriceQuote, setOriginalPriceQuote] = useState<number>(0);
  const [employeeLocation, setEmployeeLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [declineReason, setDeclineReason] = useState('');
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string>('');
  const [employeeMovingLocation, setEmployeeMovingLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [eta, setEta] = useState<string | null>(null);
  const [showWaitingForRevision, setShowWaitingForRevision] = useState(false);

  // Employee assignment and decline tracking per request
  const [assignedEmployee, setAssignedEmployee] = useState<string>('');
  const [employeeDeclineCount, setEmployeeDeclineCount] = useState<number>(0);
  const [hasReceivedRevision, setHasReceivedRevision] = useState<boolean>(false);

  // Glovo-style status tracking
  const [employeeStatusUpdates, setEmployeeStatusUpdates] = useState<EmployeeStatusUpdate[]>([]);
  const [currentEmployeeLocation, setCurrentEmployeeLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Reset employee assignment when a new request is started or finished
  useEffect(() => {
    if (!ongoingRequest) {
      setAssignedEmployee('');
      setEmployeeDeclineCount(0);
      setHasReceivedRevision(false);
      setCurrentEmployeeName('');
      setEmployeeStatusUpdates([]);
      setCurrentEmployeeLocation(undefined);
    }
  }, [ongoingRequest]);

  // Update local states when ongoing request changes
  useEffect(() => {
    if (ongoingRequest) {
      if (ongoingRequest.priceQuote !== undefined) {
        setPriceQuote(ongoingRequest.priceQuote);
        if (originalPriceQuote === 0) {
          setOriginalPriceQuote(ongoingRequest.priceQuote);
        }
      }
      if (ongoingRequest.employeeName) {
        console.log('Setting employee name from ongoing request:', ongoingRequest.employeeName);
        setCurrentEmployeeName(ongoingRequest.employeeName);
        // Set assigned employee if not already set
        if (!assignedEmployee) {
          setAssignedEmployee(ongoingRequest.employeeName);
        }
      }
      if (ongoingRequest.id) {
        loadSnapshot(ongoingRequest.id);
      }
    }
  }, [ongoingRequest, originalPriceQuote, loadSnapshot, assignedEmployee]);

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (ongoingRequest?.id) {
        EmployeeSimulationService.stopSimulation(ongoingRequest.id);
      }
    };
  }, [ongoingRequest?.id]);

  const handleSubmit = useCallback(() => {
    if (!validateMessage(message, type)) {
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const requestId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      // Reset employee assignment for new request
      setAssignedEmployee('');
      setEmployeeDeclineCount(0);
      setHasReceivedRevision(false);
      setCurrentEmployeeName('');
      setEmployeeStatusUpdates([]);
      setCurrentEmployeeLocation(undefined);
      
      const newOngoingRequest = {
        id: requestId,
        type,
        status: 'pending' as const,
        timestamp: new Date().toLocaleString(),
        location: 'Sofia Center, Bulgaria',
        declinedEmployees: []
      };
      
      setOngoingRequest(newOngoingRequest);
      setStatus('pending');
      setIsSubmitting(false);
      setShowRealTimeUpdate(true);
      
      toast({
        title: "Request Sent",
        description: "Your request has been sent to our team."
      });

      // Start Glovo-style employee simulation
      EmployeeSimulationService.startEmployeeSimulation(
        requestId,
        type,
        userLocation,
        // Status update callback
        (statusUpdate: EmployeeStatusUpdate) => {
          setEmployeeStatusUpdates(prev => [...prev, statusUpdate]);
          
          // Update ETA if provided
          if (statusUpdate.estimatedArrival) {
            const minutes = Math.floor(statusUpdate.estimatedArrival / 60);
            const seconds = statusUpdate.estimatedArrival % 60;
            setEta(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          }
        },
        // Location update callback
        (locationUpdate: EmployeeLocationUpdate) => {
          setCurrentEmployeeLocation({
            lat: locationUpdate.lat,
            lng: locationUpdate.lng
          });
          
          // Update ETA
          if (locationUpdate.estimatedArrival) {
            const minutes = Math.floor(locationUpdate.estimatedArrival / 60);
            const seconds = locationUpdate.estimatedArrival % 60;
            setEta(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          }
        },
        // Price quote callback
        async (employee, quote: number) => {
          console.log('Quote received from employee:', employee.full_name, 'Amount:', quote);
          setPriceQuote(quote);
          setOriginalPriceQuote(quote);
          setCurrentEmployeeName(employee.full_name);
          setAssignedEmployee(employee.full_name);
          
          await storeSnapshot(requestId, type, quote, employee.full_name, false);
          
          setOngoingRequest(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              priceQuote: quote,
              employeeName: employee.full_name
            };
            console.log('Updated ongoing request with employee name:', employee.full_name);
            return updated;
          });
          
          setShowRealTimeUpdate(false);
          setShowPriceQuote(true);
        },
        // Decline callback
        (reason: string) => {
          setCurrentEmployeeName('');
          setAssignedEmployee('');
          setOngoingRequest(null);
          setShowRealTimeUpdate(false);
          setShowPriceQuote(false);
          setStatus('declined');
          setDeclineReason(reason);
          setEmployeeStatusUpdates([]);
          setCurrentEmployeeLocation(undefined);
          toast({
            title: "No employees available",
            description: reason,
            variant: "destructive"
          });
        }
      );
    }, 1500);
  }, [validateMessage, message, type, setOngoingRequest, userLocation, storeSnapshot]);

  const handleAcceptQuote = useCallback(async () => {
    if (!user || !ongoingRequest || !currentEmployeeName) return;
    
    console.log('Accepting quote from employee:', currentEmployeeName);
    
    setShowPriceQuote(false);
    setShowRealTimeUpdate(true);
    setStatus('accepted');
    
    setOngoingRequest(prev => prev ? { 
      ...prev, 
      status: 'accepted' as const 
    } : null);
    
    toast({
      title: "Quote Accepted",
      description: `${currentEmployeeName} is on the way to your location.`
    });

    // Start the en route simulation
    const employee = { full_name: currentEmployeeName } as any;
    EmployeeSimulationService.acceptPriceQuote(ongoingRequest.id, employee, userLocation);

    // Listen for completion
    const checkCompletion = setInterval(() => {
      const latestUpdate = employeeStatusUpdates[employeeStatusUpdates.length - 1];
      if (latestUpdate?.status === 'completed') {
        clearInterval(checkCompletion);
        
        // Service completion
        setTimeout(async () => {
          toast({
            title: "Service Completed",
            description: `Your ${type} service has been completed successfully.`
          });
          
          // Add to user history
          try {
            await UserHistoryService.addHistoryEntry({
              user_id: user.username,
              username: user.username,
              service_type: type,
              status: 'completed',
              employee_name: currentEmployeeName,
              price_paid: priceQuote,
              service_fee: 5,
              total_price: priceQuote + 5,
              request_date: new Date().toISOString(),
              completion_date: new Date().toISOString(),
              address_street: 'Sofia Center, Bulgaria',
              latitude: userLocation.lat,
              longitude: userLocation.lng
            });
          } catch (error) {
            console.error('Error recording completion:', error);
          }
          
          // Clean up state and close all windows
          setOngoingRequest(null);
          setShowRealTimeUpdate(false);
          setShowPriceQuote(false);
          setEmployeeMovingLocation(undefined);
          setEta(null);
          setAssignedEmployee('');
          setEmployeeDeclineCount(0);
          setHasReceivedRevision(false);
          setCurrentEmployeeName('');
          setEmployeeStatusUpdates([]);
          setCurrentEmployeeLocation(undefined);
        }, 2000);
      }
    }, 1000);

  }, [user, ongoingRequest, currentEmployeeName, userLocation, setOngoingRequest, priceQuote, type, employeeStatusUpdates]);

  const handleDeclineQuote = useCallback(async (isSecondDecline: boolean = false) => {
    if (!user || !assignedEmployee || !ongoingRequest) return;
    
    console.log('Declining quote from employee:', assignedEmployee, 'Second decline:', isSecondDecline);
    
    const newDeclineCount = employeeDeclineCount + 1;
    setEmployeeDeclineCount(newDeclineCount);
    
    if (newDeclineCount === 1 && !hasReceivedRevision) {
      // First decline - same employee sends revision
      setShowPriceQuote(false);
      setShowWaitingForRevision(true);
      setHasReceivedRevision(true);
      
      toast({
        title: "Quote Declined",
        description: `${assignedEmployee} will send you a revised quote.`
      });
      
      // Show waiting screen for 2 seconds, then revised quote from SAME employee
      setTimeout(() => {
        setShowWaitingForRevision(false);
        
        // Generate revised quote (lower than original)
        const revisedQuote = Math.max(10, priceQuote - Math.floor(Math.random() * 15) - 5);
        setPriceQuote(revisedQuote);
        
        console.log('Revised quote from same employee:', assignedEmployee, 'Amount:', revisedQuote);
        
        setOngoingRequest(prev => prev ? {
          ...prev,
          priceQuote: revisedQuote,
          employeeName: assignedEmployee // Keep same employee
        } : null);
        
        setShowPriceQuote(true);
        
        toast({
          title: "Revised Quote Received",
          description: `${assignedEmployee} sent a revised quote of ${revisedQuote} BGN.`
        });
      }, 2000);
      
    } else {
      // Second decline OR decline after revision - blacklist employee and find new one
      console.log('Second decline - blacklisting employee:', assignedEmployee);
      
      // Stop current simulation
      EmployeeSimulationService.stopSimulation(ongoingRequest.id);
      
      // Add employee to blacklist
      try {
        await SimulatedEmployeeBlacklistService.addToBlacklist(ongoingRequest.id, assignedEmployee, user.username);
      } catch (error) {
        console.error('Error adding employee to blacklist:', error);
      }
      
      // Record decline in history
      try {
        await UserHistoryService.addHistoryEntry({
          user_id: user.username,
          username: user.username,
          service_type: type,
          status: 'declined',
          employee_name: assignedEmployee,
          request_date: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          address_street: 'Sofia Center, Bulgaria',
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          decline_reason: 'User declined quote twice'
        });
      } catch (error) {
        console.error('Error recording decline:', error);
      }
      
      // Reset employee assignment and find new one
      const previousEmployee = assignedEmployee;
      setAssignedEmployee('');
      setEmployeeDeclineCount(0);
      setHasReceivedRevision(false);
      setCurrentEmployeeName('');
      setEmployeeStatusUpdates([]);
      setCurrentEmployeeLocation(undefined);
      
      setShowPriceQuote(false);
      setShowRealTimeUpdate(true);
      setStatus('pending');
      
      toast({
        title: "Quote Declined",
        description: "Looking for another available employee..."
      });
      
      // Start new employee simulation
      setTimeout(() => {
        EmployeeSimulationService.startEmployeeSimulation(
          ongoingRequest.id,
          type,
          userLocation,
          // Status update callback
          (statusUpdate: EmployeeStatusUpdate) => {
            setEmployeeStatusUpdates(prev => [...prev, statusUpdate]);
          },
          // Location update callback
          (locationUpdate: EmployeeLocationUpdate) => {
            setCurrentEmployeeLocation({
              lat: locationUpdate.lat,
              lng: locationUpdate.lng
            });
          },
          // Price quote callback
          async (employee, quote: number) => {
            console.log('New quote from new employee:', employee.full_name, 'Amount:', quote);
            setPriceQuote(quote);
            setCurrentEmployeeName(employee.full_name);
            setAssignedEmployee(employee.full_name);
            setEmployeeDeclineCount(0);
            setHasReceivedRevision(false);
            
            setOngoingRequest(prev => prev ? {
              ...prev,
              priceQuote: quote,
              employeeName: employee.full_name
            } : null);
            
            setShowRealTimeUpdate(false);
            setShowPriceQuote(true);
          },
          // Decline callback
          (reason: string) => {
            setCurrentEmployeeName('');
            setAssignedEmployee('');
            setOngoingRequest(null);
            setShowRealTimeUpdate(false);
            setShowPriceQuote(false);
            setStatus('declined');
            setDeclineReason(reason);
            setEmployeeStatusUpdates([]);
            setCurrentEmployeeLocation(undefined);
            toast({
              title: "No employees available",
              description: reason,
              variant: "destructive"
            });
          }
        );
      }, 2000);
    }
  }, [user, assignedEmployee, employeeDeclineCount, hasReceivedRevision, priceQuote, setOngoingRequest, type, userLocation, ongoingRequest]);
  
  const handleCancelRequest = useCallback(async () => {
    if (ongoingRequest) {
      // Stop simulation
      EmployeeSimulationService.stopSimulation(ongoingRequest.id);
      // Clear blacklist when request is cancelled
      await SimulatedEmployeeBlacklistService.clearBlacklistForRequest(ongoingRequest.id);
    }
    setAssignedEmployee('');
    setEmployeeDeclineCount(0);
    setHasReceivedRevision(false);
    setCurrentEmployeeName('');
    setEmployeeStatusUpdates([]);
    setCurrentEmployeeLocation(undefined);
    cancelRequest(setShowPriceQuote);
  }, [cancelRequest, ongoingRequest]);

  const showStoredPriceQuote = useCallback(() => {
    if (storedSnapshot) {
      setShowPriceQuote(true);
    }
  }, [storedSnapshot]);

  // Computed value for hasDeclinedOnce based on employee decline count and revision status
  const hasDeclinedOnce = employeeDeclineCount > 0 || hasReceivedRevision;

  return useMemo(() => ({
    message,
    setMessage,
    isSubmitting,
    showRealTimeUpdate,
    showPriceQuote,
    setShowPriceQuote,
    priceQuote,
    employeeLocation: employeeMovingLocation || employeeLocation,
    status,
    declineReason,
    currentEmployeeName: ongoingRequest?.employeeName || currentEmployeeName,
    hasDeclinedOnce,
    eta,
    showWaitingForRevision,
    handleSubmit,
    handleAcceptQuote,
    handleDeclineQuote,
    handleCancelRequest,
    handleContactSupport,
    storedSnapshot,
    showStoredPriceQuote,
    employeeStatusUpdates,
    currentEmployeeLocation
  }), [
    message,
    isSubmitting,
    showRealTimeUpdate,
    showPriceQuote,
    priceQuote,
    employeeMovingLocation,
    employeeLocation,
    status,
    declineReason,
    ongoingRequest?.employeeName,
    currentEmployeeName,
    hasDeclinedOnce,
    eta,
    showWaitingForRevision,
    handleSubmit,
    handleAcceptQuote,
    handleDeclineQuote,
    handleCancelRequest,
    handleContactSupport,
    storedSnapshot,
    showStoredPriceQuote,
    employeeStatusUpdates,
    currentEmployeeLocation
  ]);
};