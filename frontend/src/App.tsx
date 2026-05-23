import { AppProvider, useAppStore } from './store/AppContext';
import { SceneEditorPage }          from './pages/SceneEditorPage';
import { TimelineEditorPage }       from './pages/TimelineEditorPage';
import './App.css';

// Router: reads `page` from global state and renders the matching page component.
// To add a new page: add a case here + a file in /pages/.
function Router() {
  const { state } = useAppStore();
  switch (state.page) {
    case 'scene-editor':    return <SceneEditorPage />;
    case 'timeline-editor': return <TimelineEditorPage />;
  }
}

// App: root component. AppProvider wraps everything so all pages share state.
export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}