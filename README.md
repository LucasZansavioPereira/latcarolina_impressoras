# PrintControl — Sistema de Registro de Impressoras

Backend em **Java (Spring Boot)** + frontend web com design próprio. Os dados ficam salvos em um banco de dados local (H2, arquivo em disco), então nada se perde ao reiniciar.

## Como rodar

Pré-requisitos: **Java 17+** e **Maven** instalados.

```bash
cd printer-app
mvn spring-boot:run
```

Depois acesse: **http://localhost:8080**

A primeira execução cria automaticamente o arquivo do banco de dados na pasta `data/`.

## Como usar

- **Nova impressora**: clique no botão no topo. Só o código é obrigatório — o resto (problema, setor, marca/modelo) é opcional.
- **Editar**: clique em qualquer card para abrir, mudar o status (Funcionando / Quebrada / Manutenção) ou os dados, e salvar.
- **Excluir**: dentro do card aberto, botão "Excluir".
- **Buscar/filtrar**: barra de busca e os chips no topo (Todas / Funcionando / Quebradas / Manutenção).
- As impressoras quebradas aparecem com a borda e o selo em vermelho; em manutenção, amarelo; funcionando, verde.

## Estrutura do projeto

```
printer-app/
├── pom.xml
├── src/main/java/com/printers/control/
│   ├── PrinterControlApplication.java   (ponto de entrada)
│   ├── model/Printer.java               (entidade JPA)
│   ├── repository/PrinterRepository.java
│   ├── service/PrinterService.java
│   └── controller/PrinterController.java (API REST em /api/printers)
└── src/main/resources/
    ├── application.properties
    └── static/ (index.html, style.css, app.js — frontend)
```

## API REST

| Método | Rota                 | Descrição                  |
|--------|-----------------------|-----------------------------|
| GET    | /api/printers          | Lista todas                |
| GET    | /api/printers/{id}     | Busca uma                  |
| POST   | /api/printers          | Cria nova                  |
| PUT    | /api/printers/{id}     | Atualiza                   |
| DELETE | /api/printers/{id}     | Exclui                     |

## Gerar um .jar executável

```bash
mvn clean package
java -jar target/printer-control-1.0.0.jar
```
