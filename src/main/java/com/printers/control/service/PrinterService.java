package com.printers.control.service;

import com.printers.control.model.Printer;
import com.printers.control.repository.PrinterRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class PrinterService {

    private final PrinterRepository repository;
    private final PrinterConnectivityService connectivityService;

    public PrinterService(PrinterRepository repository, PrinterConnectivityService connectivityService) {
        this.repository = repository;
        this.connectivityService = connectivityService;
    }

    public List<Printer> findAll() {
        return repository.findAllByOrderByUpdatedAtDesc();
    }

    public Printer findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Impressora não encontrada: " + id));
    }

    public Printer create(Printer printer) {
        printer.setId(null);
        if (printer.getStatus() == null) {
            printer.setStatus(Printer.Status.FUNCIONANDO);
        }
        if (printer.getCodigo() == null || printer.getCodigo().isBlank()) {
            throw new IllegalArgumentException("O código da impressora é obrigatório");
        }
        if (printer.getModelo() == null || printer.getModelo().isBlank()) {
            throw new IllegalArgumentException("O modelo da impressora é obrigatório");
        }
        validateUniqueCodigoStatus(printer.getCodigo(), printer.getStatus(), printer.getModelo(), null);
        if (printer.getConnectionType() == null) {
            printer.setConnectionType(Printer.ConnectionType.ETHERNET);
        }
        if (printer.getConnectionType() == Printer.ConnectionType.USB) {
            printer.setIp(null);
            printer.setMarcaModelo(null);
            printer.setConnectivityStatus(Printer.ConnectivityStatus.NAO_VERIFICADO);
        } else {
            validateIpAndMac(printer.getIp(), printer.getMarcaModelo());
        }

        Printer savedPrinter = repository.save(printer);
        return connectivityService.verificarImpressora(savedPrinter);
    }

    public Printer update(String id, Printer changes) {
        Printer existing = findById(id);
        String finalCodigo = changes.getCodigo() != null ? changes.getCodigo() : existing.getCodigo();
        Printer.Status finalStatus = changes.getStatus() != null ? changes.getStatus() : existing.getStatus();
        String finalModelo = changes.getModelo() != null ? changes.getModelo() : existing.getModelo();
        Printer.ConnectionType finalConnType = changes.getConnectionType() != null ? changes.getConnectionType() : existing.getConnectionType();
        String finalIp = changes.getIp() != null ? changes.getIp() : existing.getIp();
        String finalMac = changes.getMarcaModelo() != null ? changes.getMarcaModelo() : existing.getMarcaModelo();

        if (finalModelo == null || finalModelo.isBlank()) {
            throw new IllegalArgumentException("O modelo da impressora é obrigatório");
        }
        validateUniqueCodigoStatus(finalCodigo, finalStatus, finalModelo, id);

        existing.setCodigo(finalCodigo);
        existing.setStatus(finalStatus);
        existing.setProblema(changes.getProblema());
        existing.setSetorAntigo(changes.getSetorAntigo());
        existing.setSetorNovo(changes.getSetorNovo());
        existing.setModelo(finalModelo);
        existing.setMarcaModelo(finalMac);
        existing.setIp(finalIp);
        existing.setConnectionType(finalConnType);

        if (existing.getConnectionType() == Printer.ConnectionType.USB) {
            existing.setIp(null);
            existing.setMarcaModelo(null);
            existing.setConnectivityStatus(Printer.ConnectivityStatus.NAO_VERIFICADO);
        } else {
            validateIpAndMac(existing.getIp(), existing.getMarcaModelo());
        }

        Printer savedPrinter = repository.save(existing);
        return connectivityService.verificarImpressora(savedPrinter);
    }

    private static final String IP_REGEX = "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
    private static final String MAC_REGEX = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$";

    private void validateIpAndMac(String ip, String mac) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("Informe o endereço IP para conexão Ethernet");
        }
        if (!ip.trim().matches(IP_REGEX)) {
            throw new IllegalArgumentException("Endereço IP inválido. Digite um IP no formato correto (ex: 192.168.1.50).");
        }
        if (mac == null || mac.isBlank()) {
            throw new IllegalArgumentException("Informe o endereço MAC para conexão Ethernet");
        }
        if (!mac.trim().matches(MAC_REGEX)) {
            throw new IllegalArgumentException("Endereço MAC inválido. Digite um MAC no formato correto (ex: AA:BB:CC:DD:EE:FF).");
        }
    }

    private void validateUniqueCodigoStatus(String codigo, Printer.Status status, String modelo, String currentId) {
        // BACKUP status allows only one BACKUP per codigo, regardless of modelo
        if (status == Printer.Status.BACKUP) {
            Optional<Printer> backupWithCodigo = repository.findByCodigoAndStatus(codigo, Printer.Status.BACKUP);
            if (backupWithCodigo.isPresent() && (currentId == null || !backupWithCodigo.get().getId().equals(currentId))) {
                throw new IllegalArgumentException("Já existe uma impressora BACKUP cadastrada com esse código.");
            }
            return;
        }

        // For non-BACKUP statuses, allow the same codigo and status only when the modelo differs.
        List<Printer> sameCodeSameStatus = repository.findByCodigo(codigo).stream()
                .filter(p -> p.getStatus() == status)
                .toList();

        boolean duplicateModelo = sameCodeSameStatus.stream()
                .anyMatch(p -> p.getModelo() != null && p.getModelo().equalsIgnoreCase(modelo)
                        && (currentId == null || !p.getId().equals(currentId)));

        if (duplicateModelo) {
            throw new IllegalArgumentException("Já existe uma impressora com mesmo nome, status e modelo.");
        }
    }

    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Impressora não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
