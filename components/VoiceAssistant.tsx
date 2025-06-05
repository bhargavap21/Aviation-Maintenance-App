'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Loader2, MessageSquare, X } from 'lucide-react';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceAssistant({ isOpen, onClose }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your aviation maintenance assistant. I can help you with work orders, aircraft status, scheduling, and compliance questions. Try saying "Show me aircraft status" or "Create a work order for N123AB".',
      timestamp: new Date()
    }
  ]);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processVoiceCommand = async (text: string): Promise<string> => {
    // Simple command processing (in a real app, this would call your OpenAI API)
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('aircraft') && lowerText.includes('status')) {
      return 'I can see you have 3 aircraft in your fleet. N123AB and N789XY are currently available, while N456CD is in maintenance for a 100-hour inspection. The inspection should be completed by tomorrow evening.';
    }
    
    if (lowerText.includes('work order') || lowerText.includes('create')) {
      const tailNumber = extractTailNumber(lowerText);
      if (tailNumber) {
        return `I'll help you create a work order for ${tailNumber.toUpperCase()}. What type of maintenance work needs to be performed? You can specify things like "oil change", "tire replacement", or "A-check inspection".`;
      }
      return 'I can help you create a work order. Which aircraft tail number would you like this for?';
    }
    
    if (lowerText.includes('schedule') || lowerText.includes('due')) {
      return 'Looking at your maintenance schedule, you have an A-check due for N123AB in 15 flight hours, and N456CD has a 100-hour inspection that\'s currently 5 hours overdue. Would you like me to prioritize scheduling the overdue inspection?';
    }
    
    if (lowerText.includes('compliance') || lowerText.includes('part 135')) {
      return 'Your fleet is currently 95% compliant with Part 135 requirements. The only issue is the overdue 100-hour inspection on N456CD. All annual inspections are current, and your maintenance tracking is up to date.';
    }
    
    if (lowerText.includes('help') || lowerText.includes('what can you do')) {
      return 'I can help you with aircraft status, work order management, maintenance scheduling, and Part 135 compliance questions. I can also create work orders, check due dates, and provide maintenance recommendations. What would you like to know?';
    }
    
    return 'I understand you said "' + text + '". I can help with aircraft status, work orders, scheduling, and compliance. Could you please rephrase your request or ask me something specific about maintenance operations?';
  };

  const extractTailNumber = (text: string): string | null => {
    // Look for patterns like N123AB, N456CD, etc.
    const match = text.match(/n[0-9a-z]{2,5}/i);
    return match ? match[0] : null;
  };

  const handleVoiceInput = useCallback(async (text: string) => {
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      isVoice: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Process the voice command
      const response = await processVoiceCommand(text);
      
      const assistantMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        synthRef.current.speak(utterance);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      
      const errorMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true);
      synthRef.current = speechSynthesis;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          handleVoiceInput(finalTranscript);
          setTranscript('');
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setTranscript('');
      };
      
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handleVoiceInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleTextInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      handleVoiceInput(e.currentTarget.value.trim());
      e.currentTarget.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Voice Assistant</h2>
              <p className="text-sm text-gray-500">Aviation Maintenance Helper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  {message.isVoice && (
                    <Volume2 className="h-3 w-3 opacity-70" />
                  )}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  <p className="text-sm text-gray-600">Processing...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          {!isSupported ? (
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Voice recognition is not supported in your browser. Please use a modern browser like Chrome or Edge.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Voice Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={`p-4 rounded-full transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isListening ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </button>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {isListening ? 'Listening...' : 'Click to speak'}
                  </p>
                  {transcript && (
                    <p className="text-xs text-gray-500 mt-1">"{transcript}"</p>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Or type your message here and press Enter..."
                  onKeyDown={handleTextInput}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div className="text-xs text-gray-500 text-center">
                Try: "Show aircraft status", "Create work order for N123AB", or "Check maintenance schedule"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 