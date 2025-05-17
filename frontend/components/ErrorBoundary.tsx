// ErrorBoundary komponenta služi za hvatanje i prikaz grešaka u React komponentama.
// Omogućuje aplikaciji da nastavi s radom i prikaže korisničku poruku umjesto rušenja cijelog sučelja.

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  // Inicijalno stanje - nema greške
  state: State = {
    hasError: false
  };

  /**
   * Ova metoda se poziva kada dođe do greške u child komponentama
   * @returns Novo stanje s hasError: true
   */
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // Logiranje greške za potrebe debuggiranja
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     
    console.error('Neuhvaćena greška u ErrorBoundary:', error, errorInfo);
  }

  // Render metoda prikazuje fallback UI ako je došlo do greške
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-red-800">Došlo je do greške</h2>
          <button
            className="mt-2 text-red-600 hover:text-red-800"
            onClick={() => this.setState({ hasError: false })}
          >
            Pokušaj ponovno
          </button>
        </div>
      );
    }

    // Ako nema greške, prikazuju se child komponente
    return this.props.children;
  }
}

// Defaultni export ErrorBoundary komponente
export default ErrorBoundary;