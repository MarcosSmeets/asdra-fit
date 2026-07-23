import { Redirect } from 'expo-router';
import React from 'react';
import { useSessionStore } from '../src/stores/sessionStore';
import { entryRouteForProgress } from '../src/domain/userProgress';

/** Roteamento inicial baseado no estado da sessão (local-first). */
export default function Index(): React.ReactElement {
  const { ready, mode, progress } = useSessionStore();
  return <Redirect href={entryRouteForProgress(ready, mode, progress)} />;
}
