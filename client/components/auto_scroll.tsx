import { useRef, useState, useEffect } from 'react';

// NOTE: this does not work in some situations where the ref changes
// maybe port to function refs if needed

export const useKeepScrolledDown = (data: unknown) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // check whether we are currently at bottom

  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const container = containerRef.current;

    if(container == null) {
      return;
    }

    const handleScroll = () => {
      const bottom = container.scrollHeight - container.scrollTop === container.clientHeight;
      setAtBottom(bottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // scroll down if at bottom before

  useEffect(() => {
    if(endRef.current == null) {
      return;
    }

    if(atBottom) {
      endRef.current.scrollIntoView()
    }
  }, [data]);

  // return refs for user to apply

  return [containerRef, endRef];
};
