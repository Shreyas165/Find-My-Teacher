// src/components/PeopleList.js
import React, { useState, useEffect } from 'react';

const PeopleList = ({ buildingId }) => {
    const [people, setPeople] = useState([]);

    useEffect(() => {
        // Fetch people data from backend API
        const fetchPeople = async () => {
            const response = await fetch(`/api/building/${buildingId}/people`);
            const data = await response.json();
            setPeople(data);
        };

        fetchPeople();
    }, [buildingId]);

    return (
        <select>
            <option>Select a person</option>
            {people.map((person, index) => (
                <option key={index} value={person.Name}>
                    {person.Name} - {person.Room}
                </option>
            ))}
        </select>
    );
};

export default PeopleList;
