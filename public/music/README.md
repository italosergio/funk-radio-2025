# Pasta de Músicas

Coloque seus arquivos de música aqui (MP3, WAV, OGG).

Exemplo de estrutura:
```
music/
├── funk1.mp3
├── funk2.mp3
└── funk3.mp3
```

Depois configure a PLAYLIST no arquivo `src/App.jsx`:

```javascript
const PLAYLIST = [
  { id: 1, title: 'Nome da Música 1', artist: 'Artista 1', src: '/music/funk1.mp3' },
  { id: 2, title: 'Nome da Música 2', artist: 'Artista 2', src: '/music/funk2.mp3' },
]
```