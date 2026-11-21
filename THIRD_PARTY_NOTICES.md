# Сторонние компоненты и лицензии

## Bencho

Два компонента адаптированы из Bencho: поле с поднимающейся подписью (`frontend/src/bencho/Field.jsx`) и кнопка подтверждения (`frontend/src/bencho/SlideToSubmit.jsx`). Оригинал: https://bencho.dev/

```text
MIT License

Copyright (c) 2026 Lorenzo Cabra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Not covered by this licence: the Bencho name and the goat mark, and the
photographs shown on bencho.dev (none are included here). Third-party
material keeps its own licence; see THIRD_PARTY.md.
```

## Шрифты

- Inter — SIL Open Font License 1.1, https://github.com/rsms/inter
- Unbounded — SIL Open Font License 1.1, https://github.com/googlefonts/unbounded
- Onest — SIL Open Font License 1.1, Copyright 2021 The Onest Project Authors, https://github.com/simpals/onest

Текущий интерфейс использует локальный `@fontsource-variable/onest`. Inter и Unbounded относятся к предыдущей версии и остаются в зависимостях проекта.

## Иконки

Solar Icons (480 Design) — CC BY 4.0, https://icon-sets.iconify.design/solar/ и https://www.figma.com/community/file/1166831539721848736

Иконки взяты из линейного набора Solar без изменений. Поставка — пакеты
`@iconify-icons/solar` (данные иконок, CC BY 4.0) и `@iconify/react` (MIT).

## JavaScript-зависимости

React, React DOM, React Router, Framer Motion, Iconify, Vite — лицензии указаны в `frontend/package-lock.json` и в пакетах `node_modules`.

## PDF

ReportLab — BSD, Pillow — HPND (лицензии поставляются с Python-пакетами).
Шрифт Noto Sans — SIL Open Font License 1.1; копия лицензии: `backend/fonts/LICENSE`.
