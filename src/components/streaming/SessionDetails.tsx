
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Session } from '@/types/session';

interface SessionDetailsProps {
  session: Session;
  isRecording?: boolean;
  recordingStartTime?: string;
}

const SessionDetails = ({ session, isRecording, recordingStartTime }: SessionDetailsProps) => {
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [streamDuration, setStreamDuration] = useState<string>('');

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRecording && recordingStartTime) {
      const updateTimer = () => {
        const start = new Date(recordingStartTime).getTime();
        const now = new Date().getTime();
        const diff = now - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateTimer(); // Initial call
      intervalId = setInterval(updateTimer, 1000);
    }

    // Calculate stream duration
    if (session.start_time) {
      const startTime = new Date(session.start_time);
      setStreamDuration(formatDistanceToNow(startTime, { addSuffix: true }));
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording, recordingStartTime, session.start_time]);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base sm:text-lg">Session Details</h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p><span className="font-medium">Name:</span> {session.name}</p>
        <p><span className="font-medium">Started:</span> {streamDuration}</p>
        <p><span className="font-medium">Max Participants:</span> {session.max_participants}</p>
        <p><span className="font-medium">Orientation:</span> {session.orientation || 'Landscape'}</p>
        <p><span className="font-medium">Privacy:</span> {session.privacy || 'Public'}</p>
        <p><span className="font-medium">Session Type:</span> {session.session_type || 'Free'}</p>
        {session.price !== undefined && session.price > 0 && (
          <p><span className="font-medium">Price:</span> ${session.price.toFixed(2)}</p>
        )}
        
        {session.stream_url && (
          <div className="pt-2">
            <p><span className="font-medium">Stream URL:</span></p>
            <code className="bg-muted p-1 rounded text-xs block overflow-x-auto whitespace-nowrap">
              {session.stream_url}
            </code>
          </div>
        )}
        
        {session.stream_key && (
          <div className="pt-1">
            <p><span className="font-medium">Stream Key:</span></p>
            <code className="bg-muted p-1 rounded text-xs block overflow-x-auto whitespace-nowrap">
              {session.stream_key}
            </code>
          </div>
        )}
        
        {session.description && (
          <p className="pt-2"><span className="font-medium">Description:</span> {session.description}</p>
        )}
        
        {isRecording && (
          <div className="flex items-center gap-2 text-destructive font-medium pt-2">
            <Timer className="h-4 w-4 animate-pulse" />
            <span>Recording: {elapsedTime}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetails;
