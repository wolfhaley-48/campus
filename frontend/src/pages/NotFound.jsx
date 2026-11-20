import { Link } from "../navigation";

export default function NotFound() {
  return (
    <div className="page notfound">
      <span className="notfound-code">404</span>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь на главную. Ссылка могла устареть.</p>
      <Link to="/" className="btn btn-primary">
        На главную
      </Link>
    </div>
  );
}
