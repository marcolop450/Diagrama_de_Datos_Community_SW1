package com.sw1.casetool.repository;

import com.sw1.casetool.model.DomainTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DomainTemplateRepository extends JpaRepository<DomainTemplate, String> {

    List<DomainTemplate> findAllByOrderByCategoryAscNameAsc();

    List<DomainTemplate> findByCategoryIgnoreCase(String category);
}
