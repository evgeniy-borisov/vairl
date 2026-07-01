# Ноутбуки

Примеры Jupyter-ноутбуков для публикации в [Google Colab](https://colab.research.google.com/).

## Открыть в Colab

Замените путь на нужный файл:

```
https://colab.research.google.com/github/<owner>/<repo>/blob/main/notebooks/<имя-файла>.ipynb
```

## Ноутбуки

| Файл | Описание |
|------|----------|
| [example.ipynb](example.ipynb) | Шаблон с бейджем Colab |
| [hypothesis-synthesis-agents.ipynb](hypothesis-synthesis-agents.ipynb) | Локальная LLM + ChromaDB: синтез гипотез для повышения качества агентов |
| [hybrid-agent-dag-fsm-bt.ipynb](hybrid-agent-dag-fsm-bt.ipynb) | DAG, FSM и Behavior Tree: минимальные исполнители, визуализация и конвертация |
| [semantic-torrent.ipynb](semantic-torrent.ipynb) | Semantic Torrent: чанки, хэши, TF-IDF embeddings, семантический DHT и поиск по смыслу |
| [pytorch-to-browser-onnx.ipynb](pytorch-to-browser-onnx.ipynb) | PyTorch → ONNX: обучение TinyCNN на MNIST и экспорт для ONNX Runtime Web в браузере |

## Добавление нового ноутбука

1. Создайте `.ipynb` в этой папке.
2. Добавьте в начало ячейку со ссылкой «Open in Colab» (см. `example.ipynb`).
3. Укажите зависимости в отдельной ячейке установки (`!pip install ...`).
