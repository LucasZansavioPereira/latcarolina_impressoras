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
        validateUniqueCodigoStatus(printer.getCodigo(), printer.getStatus(), null);
        if (printer.getConnectionType() == null) {
            printer.setConnectionType(Printer.ConnectionType.ETHERNET);
        }
        if (printer.getConnectionType() == Printer.ConnectionType.USB) {
            printer.setIp(null);
            printer.setMarcaModelo(null);
            printer.setConnectivityStatus(Printer.ConnectivityStatus.NAO_VERIFICADO);
        }

        Printer savedPrinter = repository.save(printer);
        return connectivityService.verificarImpressora(savedPrinter);
    }

    public Printer update(String id, Printer changes) {
        Printer existing = findById(id);
        String finalCodigo = changes.getCodigo() != null ? changes.getCodigo() : existing.getCodigo();
        Printer.Status finalStatus = changes.getStatus() != null ? changes.getStatus() : existing.getStatus();

        validateUniqueCodigoStatus(finalCodigo, finalStatus, id);

        existing.setCodigo(finalCodigo);
        existing.setStatus(finalStatus);
        existing.setProblema(changes.getProblema());
        existing.setSetorAntigo(changes.getSetorAntigo());
        existing.setSetorNovo(changes.getSetorNovo());
        existing.setMarcaModelo(changes.getMarcaModelo());
        existing.setIp(changes.getIp());
        existing.setConnectionType(changes.getConnectionType() != null ? changes.getConnectionType() : existing.getConnectionType());
        if (existing.getConnectionType() == Printer.ConnectionType.USB) {
            existing.setIp(null);
            existing.setMarcaModelo(null);
            existing.setConnectivityStatus(Printer.ConnectivityStatus.NAO_VERIFICADO);
        }

        Printer savedPrinter = repository.save(existing);
        return connectivityService.verificarImpressora(savedPrinter);
    }

    private void validateUniqueCodigoStatus(String codigo, Printer.Status status, String currentId) {
        // BACKUP status allows one duplicate by codigo
        if (status == Printer.Status.BACKUP) {
            // For BACKUP, only check if there's another BACKUP with same codigo
            Optional<Printer> backupWithCodigo = repository.findByCodigoAndStatus(codigo, Printer.Status.BACKUP);
            if (backupWithCodigo.isPresent() && (currentId == null || !backupWithCodigo.get().getId().equals(currentId))) {
                throw new IllegalArgumentException("Já existe uma impressora BACKUP cadastrada com esse código.");
            }
        } else {
            // For other statuses (FUNCIONANDO, QUEBRADA, MANUTENCAO), no duplicates allowed by codigo
            List<Printer> allWithCodigo = repository.findByCodigo(codigo);
            boolean hasDuplicate = allWithCodigo.stream()
                    .anyMatch(p -> currentId == null || !p.getId().equals(currentId));
            if (hasDuplicate) {
                throw new IllegalArgumentException("Já existe uma impressora cadastrada com esse código. Apenas impressoras com status BACKUP podem ser duplicadas.");
            }
        }
    }

    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Impressora não encontrada: " + id);
        }
        repository.deleteById(id);
    }
}
