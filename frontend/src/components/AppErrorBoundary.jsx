import { Component } from "react";
import { LogoMark } from "./Logo";

export class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return <main className="app-failure" role="alert">
      <LogoMark size={36} />
      <h1>Не удалось открыть страницу</h1>
      <p>Обновите страницу или вернитесь на главную.</p>
      <div className="page-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Обновить</button>
        <a className="btn btn-ghost" href="/">На главную</a>
      </div>
    </main>;
  }
}
