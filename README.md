# Sorteador de Questões
Aplicação web para professores que aplicam provas orais e já usam o Obsidian para organizar questões. O sorteador carrega arquivos `.md` ou `.txt`, sorteia perguntas numeradas, controla o tempo de resposta, limita pulos e grava automaticamente o áudio da sessão do aluno para download.

## Como preparar o arquivo no Obsidian
- Crie uma nota por prova e liste as questões numeradas (`1. Pergunta`, `2) Pergunta` etc.). Linhas em branco ou começando com `#` são ignoradas.
- Exemplo:
```
1. Explique o conceito de entropia.
2. Diferencie calor e temperatura.
3) Dê um exemplo de reação endotérmica.
```
- Exporte ou copie a nota como `.md` (ou `.txt`). Não precisa ajustar nada além da numeração.

## Como usar
- Abra `index.html` no navegador (sem instalação). Ou abra diretamente o arquivo hospedado no [GitHub pages](https://ldebritto.github.io/sorteador/).
- Clique em `Carregar arquivos` e escolha uma ou mais provas (arquivos `.md`/`.txt`).
- Se mais de um arquivo for carregado, selecione a prova no dropdown. Para uma única prova o sorteio começa direto.
- Ajuste o tempo por questão (minutos) no campo ao lado do cronômetro.
- Clique em `Próxima` ou pressione `Enter` para sortear. O timer inicia e a gravação de áudio começa na primeira questão.
- Use `Pular` (barra de espaço) no máximo duas vezes por sessão de aluno. `Pausar/Retomar` (`p`) interrompe apenas o cronômetro, mas não a gravação.
- Após 3 questões respondidas sem pulos, ou ao completar 5 sorteios, a sessão exibe um resumo das perguntas para registrar a nota e dar um feedback ao aluno. A gravação prossegue até que se clique em "Nova prova", permitindo gravar também o feedback dado ao aluno.
- Ao terminar (clicar em "Nova Prova"), o áudio é baixado automaticamente como `prova_<nome-do-arquivo>_<timestamp>.webm`.

## Dicas rápidas
- Comece cada sessão com `Nova Prova` (`r`) para zerar progresso, pulos e timer.
- A gravação só inciciará _após_ o sorteio da primeira questão, ao clicar em `Próxima`
- Configure as permissões de microfone do navegador antes de iniciar para evitar interrupções.
- Mantenha um arquivo por turma ou prova-agendada; carregue vários arquivos para alternar rapidamente entre turmas.
