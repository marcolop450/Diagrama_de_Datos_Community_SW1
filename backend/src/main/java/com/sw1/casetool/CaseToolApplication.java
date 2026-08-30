package com.sw1.casetool;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;

/**
 * Clase principal de la aplicación CASE Tool.
 */
@SpringBootApplication
public class CaseToolApplication {
    public static void main(String[] args) {
        // Cargar variables de entorno desde .env (en backend/ o en la raíz del proyecto)
        try {
            Dotenv dotenv = null;
            if (new File(".env").exists()) {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            } else if (new File("../.env").exists()) {
                dotenv = Dotenv.configure().directory("../").ignoreIfMissing().load();
            }

            if (dotenv != null) {
                dotenv.entries().forEach(entry -> {
                    if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
            }
        } catch (Exception ignored) {
            // Continuar con variables de entorno del sistema si .env no existe
        }

        SpringApplication.run(CaseToolApplication.class, args);
    }
}
