package com.printers.control.service;

import com.printers.control.model.Printer;
import com.printers.control.repository.PrinterRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Serviço responsável exclusivamente por monitorar a conectividade de rede
 * das impressoras cadastradas, através do endereço IP.
 *
 * Esta lógica é mantida separada do PrinterService (que trata do CRUD e do
 * status operacional) porque representa uma responsabilidade diferente:
 * o status de conectividade aqui tratado reflete apenas se o equipamento
 * responde na rede (ping / InetAddress.isReachable), e nunca substitui o
 * status operacional (Funcionando, Quebrada, Manutenção), que continua sendo
 * controlado manualmente pela equipe de TI.
 */
@Service
public class PrinterConnectivityService {

    private static final Logger log = LoggerFactory.getLogger(PrinterConnectivityService.class);

    /** Timeout, em milissegundos, para considerar o IP indisponível. */
    private static final int TIMEOUT_MS = 3000;

    /** Limite de verificações simultâneas, para não sobrecarregar a rede ao checar muitas impressoras de uma vez. */
    private static final int MAX_CONCURRENT_CHECKS = 20;

    private final PrinterRepository repository;
    private final ExecutorService executor = Executors.newFixedThreadPool(MAX_CONCURRENT_CHECKS);

    public PrinterConnectivityService(PrinterRepository repository) {
        this.repository = repository;
    }

    /**
     * Executa automaticamente a cada 10 minutos, percorrendo todas as
     * impressoras cadastradas e atualizando o status de conectividade de cada uma.
     */
    @Scheduled(fixedRate = 10 * 60 * 1000)
    public void verificarAutomaticamente() {
        verificarTodasImpressoras();
    }

    /**
     * Verifica a conectividade de todas as impressoras cadastradas de uma vez,
     * em paralelo (limitado a {@link #MAX_CONCURRENT_CHECKS} checagens simultâneas),
     * e persiste o resultado de cada uma. Usado tanto pelo scheduler quanto por
     * uma checagem manual disparada pelo usuário.
     */
    public List<Printer> verificarTodasImpressoras() {
        List<Printer> printers = repository.findAll();
        log.info("Iniciando verificação de conectividade de {} impressora(s)", printers.size());

        List<CompletableFuture<Printer>> futures = printers.stream()
                .map(printer -> CompletableFuture.supplyAsync(() -> verificarImpressora(printer), executor))
                .collect(Collectors.toList());

        return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }

    /**
     * Verifica a conectividade de uma única impressora e persiste o resultado.
     */
    public Printer verificarImpressora(Printer printer) {
        String ip = printer.getIp();

        if (ip == null || ip.isBlank()) {
            // Sem IP cadastrado: não há o que testar, não altera o status atual.
            return printer;
        }

        boolean online = testarConectividade(ip);
        Printer.ConnectivityStatus novoStatus = online
                ? Printer.ConnectivityStatus.ONLINE
                : Printer.ConnectivityStatus.INDISPONIVEL;

        printer.setConnectivityStatus(novoStatus);
        printer.setLastConnectivityCheck(Instant.now());
        return repository.save(printer);
    }

    /** Verificação manual sob demanda para uma impressora específica (por id). */
    public Printer verificarPorId(String id) {
        Printer printer = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Impressora não encontrada: " + id));
        return verificarImpressora(printer);
    }

    private boolean testarConectividade(String ip) {
        try {
            InetAddress address = InetAddress.getByName(ip);
            return address.isReachable(TIMEOUT_MS);
        } catch (UnknownHostException e) {
            log.warn("IP inválido ou não resolvido para impressora: {}", ip);
            return false;
        } catch (IOException e) {
            log.warn("Falha ao verificar conectividade do IP {}: {}", ip, e.getMessage());
            return false;
        }
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdown();
    }
}
