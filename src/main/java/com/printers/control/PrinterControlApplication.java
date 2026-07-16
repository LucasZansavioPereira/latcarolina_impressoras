package com.printers.control;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PrinterControlApplication {
    public static void main(String[] args) {
        SpringApplication.run(PrinterControlApplication.class, args);
    }
}
