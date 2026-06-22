package com.printers.control.repository;

import com.printers.control.model.Printer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrinterRepository extends JpaRepository<Printer, String> {
    List<Printer> findAllByOrderByUpdatedAtDesc();
}
